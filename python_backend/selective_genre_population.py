#!/usr/bin/env python3
"""
Selective Genre Population Script for StreamSmart
Only collects videos for genres that need more content (below threshold)
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Set
import sys
import os

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))

try:
    from services.youtube_content_collector import (
        YouTubeContentCollector, 
        GenreCategory, 
        get_videos_sync
    )
except ImportError as e:
    print(f"Error importing YouTube collector: {e}")
    print("Make sure youtube-search-python is installed: pip install youtube-search-python")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('selective_population.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SelectiveGenrePopulator:
    def __init__(self, target_count: int = 1500, minimum_threshold: int = 500):
        """
        Initialize selective populator
        
        Args:
            target_count: Target videos per genre (default: 1500)
            minimum_threshold: Only scrape genres below this count (default: 500)
        """
        self.collector = YouTubeContentCollector()
        self.target_videos_per_genre = target_count
        self.minimum_threshold = minimum_threshold
        self.quality_threshold = 0.15
        self.results_dir = Path("genre_population_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # All genre categories
        self.all_genres = [
            # 🎯 Skill-Based Genres
            GenreCategory.CODING_PROGRAMMING,
            GenreCategory.DATA_SCIENCE_AI,
            GenreCategory.DESIGN,
            GenreCategory.DIGITAL_MARKETING,
            GenreCategory.PRODUCTIVITY,
            GenreCategory.FINANCIAL_LITERACY,
            GenreCategory.SOFT_SKILLS,
            GenreCategory.ENTREPRENEURSHIP,
            GenreCategory.WRITING_CONTENT,
            GenreCategory.PUBLIC_SPEAKING,
            
            # 📚 Academic Genres
            GenreCategory.MATHEMATICS,
            GenreCategory.PHYSICS,
            GenreCategory.BIOLOGY,
            GenreCategory.CHEMISTRY,
            GenreCategory.HISTORY_CIVICS,
            GenreCategory.LANGUAGE_LEARNING,
            
            # 💼 Career & Professional Development
            GenreCategory.RESUME_JOB_HUNTING,
            GenreCategory.INTERVIEW_PREPARATION,
            GenreCategory.FREELANCING_REMOTE,
            GenreCategory.CERTIFICATIONS,
            
            # 🧠 Tech News & Trends
            GenreCategory.TECH_NEWS,
            GenreCategory.AI_INNOVATION,
            GenreCategory.STARTUPS,
            GenreCategory.CYBERSECURITY,
            
            # 🧩 Mind-expanding & Curiosity Genres
            GenreCategory.TRIVIA_FACTS,
            GenreCategory.SCIENCE_EXPERIMENTS,
            GenreCategory.PSYCHOLOGY,
            GenreCategory.PHILOSOPHY,
            
            # 🛠️ DIY & Hands-on Learning
            GenreCategory.ROBOTICS_IOT,
            GenreCategory.ELECTRONICS_ARDUINO,
            GenreCategory.DIY_PROJECTS,
            
            # 🌱 Lifestyle Learning
            GenreCategory.HEALTH_FITNESS,
            GenreCategory.MENTAL_WELLNESS,
            GenreCategory.SUSTAINABLE_LIVING
        ]
    
    def analyze_current_status(self) -> Dict[str, Dict[str, Any]]:
        """Analyze current video counts for all genres"""
        
        logger.info("🔍 Analyzing current video counts...")
        
        status = {}
        
        for genre in self.all_genres:
            genre_file = self.results_dir / f"{genre.value}_videos.json"
            
            if genre_file.exists():
                try:
                    with open(genre_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        videos = data.get('videos', [])
                        count = len(videos)
                        
                        status[genre.value] = {
                            'current_count': count,
                            'needs_collection': count < self.minimum_threshold,
                            'target_remaining': max(0, self.target_videos_per_genre - count),
                            'file_exists': True
                        }
                        
                except Exception as e:
                    logger.warning(f"Error reading {genre_file}: {e}")
                    status[genre.value] = {
                        'current_count': 0,
                        'needs_collection': True,
                        'target_remaining': self.target_videos_per_genre,
                        'file_exists': False
                    }
            else:
                status[genre.value] = {
                    'current_count': 0,
                    'needs_collection': True,
                    'target_remaining': self.target_videos_per_genre,
                    'file_exists': False
                }
        
        return status
    
    def identify_genres_needing_collection(self) -> List[GenreCategory]:
        """Identify genres that need more videos"""
        
        status = self.analyze_current_status()
        
        genres_needing_collection = []
        
        logger.info(f"📊 CURRENT STATUS ANALYSIS (Threshold: {self.minimum_threshold} videos)")
        logger.info("=" * 80)
        
        # Sort by current count for better display
        sorted_status = sorted(status.items(), key=lambda x: x[1]['current_count'])
        
        needs_collection_count = 0
        
        for genre_name, info in sorted_status:
            status_emoji = "🔴" if info['needs_collection'] else "✅"
            
            logger.info(f"{status_emoji} {genre_name:<25} | {info['current_count']:>4} videos | "
                       f"Need: {info['target_remaining']:>4} more")
            
            if info['needs_collection']:
                needs_collection_count += 1
                # Find the corresponding GenreCategory
                for genre in self.all_genres:
                    if genre.value == genre_name:
                        genres_needing_collection.append(genre)
                        break
        
        logger.info("=" * 80)
        logger.info(f"📈 SUMMARY: {needs_collection_count}/{len(self.all_genres)} genres need collection")
        
        return genres_needing_collection
    
    def collect_videos_for_genre_sync(self, genre: GenreCategory, target_additional: int) -> List[Dict[str, Any]]:
        """Collect additional videos for a specific genre"""
        
        if genre not in self.collector.genre_queries:
            logger.warning(f"No search queries defined for genre: {genre}")
            return []
        
        all_videos = []
        queries = self.collector.genre_queries[genre]
        
        # Calculate videos per query based on what we need
        videos_per_query = max(target_additional // len(queries), 25)
        
        logger.info(f"🎯 Collecting {target_additional} additional videos for {genre.value}")
        logger.info(f"   Using {len(queries)} queries, ~{videos_per_query} per query")
        
        # Load existing video IDs to avoid duplicates
        existing_ids = self._load_existing_genre_video_ids(genre)
        
        for i, query in enumerate(queries, 1):
            try:
                logger.info(f"  📝 Query {i}/{len(queries)}: '{query}'")
                
                # Get videos with increased count
                raw_videos = get_videos_sync(query, videos_per_query * 2)
                
                query_videos = self._process_raw_videos(raw_videos, query, genre.value, existing_ids)
                all_videos.extend(query_videos)
                
                # Update existing IDs to avoid duplicates in next query
                for video in query_videos:
                    existing_ids.add(video['video_id'])
                
                logger.info(f"    ✅ Added {len(query_videos)} new videos")
                
                # Stop early if we have enough
                if len(all_videos) >= target_additional:
                    logger.info(f"    🎯 Target reached with {len(all_videos)} videos")
                    break
                
                # Rate limiting
                time.sleep(1.5)
                
            except Exception as e:
                logger.error(f"Error with query '{query}': {e}")
                continue
        
        # Remove duplicates and apply final filtering
        final_videos = self._deduplicate_and_filter(all_videos)
        
        logger.info(f"✅ Collected {len(final_videos)} new videos for {genre.value}")
        return final_videos
    
    def _load_existing_genre_video_ids(self, genre: GenreCategory) -> Set[str]:
        """Load existing video IDs for a genre to avoid duplicates"""
        
        existing_ids = set()
        genre_file = self.results_dir / f"{genre.value}_videos.json"
        
        if genre_file.exists():
            try:
                with open(genre_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    videos = data.get('videos', [])
                    for video in videos:
                        if 'video_id' in video:
                            existing_ids.add(video['video_id'])
            except Exception as e:
                logger.warning(f"Could not load existing IDs for {genre.value}: {e}")
        
        return existing_ids
    
    def _process_raw_videos(self, raw_videos: list, query: str, genre: str, existing_ids: Set[str]) -> List[Dict[str, Any]]:
        """Process raw video data with duplicate checking"""
        
        processed_videos = []
        
        for video_data in raw_videos:
            try:
                # Skip if already exists
                video_id = video_data.get('id')
                if video_id in existing_ids:
                    continue
                
                # Basic quality check
                if not self._meets_enhanced_criteria(video_data):
                    continue
                
                # Process video
                processed_video = {
                    'video_id': video_id,
                    'title': video_data.get('title', ''),
                    'channel': video_data.get('channel', ''),
                    'duration': video_data.get('duration', ''),
                    'views': video_data.get('views', ''),
                    'published': video_data.get('publishedTime', ''),
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'thumbnail': video_data.get('thumbnails', [{}])[0].get('url', '') if video_data.get('thumbnails') else '',
                    'description': video_data.get('description', ''),
                    'genre': genre,
                    'search_query': query,
                    'view_count': self._parse_view_count(video_data.get('views', '')),
                    'quality_score': self._calculate_quality_score(video_data, genre),
                    'collected_at': datetime.now().isoformat()
                }
                
                processed_videos.append(processed_video)
                
            except Exception as e:
                logger.warning(f"Error processing video: {e}")
                continue
        
        return processed_videos
    
    def _meets_enhanced_criteria(self, video_data) -> bool:
        """Enhanced criteria for video quality"""
        
        try:
            title = video_data.get('title', '').lower()
            duration = video_data.get('duration', '')
            
            # Skip very short videos (less than 2 minutes)
            if duration and any(x in duration.lower() for x in ['0:', '1:']):
                if not any(x in duration for x in ['10:', '11:', '12:', '13:', '14:', '15:', '16:', '17:', '18:', '19:']):
                    return False
            
            # Skip live streams and premieres
            if any(x in title for x in ['live', 'premiere', 'streaming now']):
                return False
            
            # Prefer educational keywords
            educational_keywords = [
                'tutorial', 'course', 'learn', 'guide', 'how to', 'explain',
                'introduction', 'basics', 'beginner', 'advanced', 'complete',
                'step by step', 'masterclass', 'training', 'lesson'
            ]
            
            has_educational_keyword = any(keyword in title for keyword in educational_keywords)
            
            return has_educational_keyword or len(title) > 20
            
        except Exception:
            return False
    
    def _parse_view_count(self, views_str: str) -> int:
        """Parse view count string to integer"""
        
        if not views_str:
            return 0
        
        try:
            # Remove non-numeric characters except K, M, B
            clean_views = views_str.replace(',', '').replace(' views', '').replace(' view', '')
            
            if 'K' in clean_views:
                return int(float(clean_views.replace('K', '')) * 1000)
            elif 'M' in clean_views:
                return int(float(clean_views.replace('M', '')) * 1000000)
            elif 'B' in clean_views:
                return int(float(clean_views.replace('B', '')) * 1000000000)
            else:
                return int(clean_views)
        except:
            return 0
    
    def _calculate_quality_score(self, video_data, genre: str) -> float:
        """Calculate quality score for video"""
        
        score = 0.0
        
        # View count factor (0-0.3)
        view_count = self._parse_view_count(video_data.get('views', ''))
        if view_count > 100000:
            score += 0.3
        elif view_count > 10000:
            score += 0.2
        elif view_count > 1000:
            score += 0.1
        
        # Title quality (0-0.3)
        title = video_data.get('title', '').lower()
        educational_keywords = ['tutorial', 'course', 'learn', 'complete', 'guide', 'masterclass']
        keyword_count = sum(1 for keyword in educational_keywords if keyword in title)
        score += min(keyword_count * 0.1, 0.3)
        
        # Channel factor (0-0.2)
        channel = video_data.get('channel', '').lower()
        if any(edu_word in channel for edu_word in ['academy', 'education', 'learning', 'university', 'school']):
            score += 0.2
        
        # Duration factor (0-0.2)
        duration = video_data.get('duration', '')
        if duration and ('10:' in duration or '20:' in duration or '30:' in duration):
            score += 0.2
        
        return min(score, 1.0)
    
    def _deduplicate_and_filter(self, videos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicates and apply final quality filtering"""
        
        seen_ids = set()
        unique_videos = []
        
        # Sort by quality score (highest first)
        sorted_videos = sorted(videos, key=lambda x: x.get('quality_score', 0), reverse=True)
        
        for video in sorted_videos:
            video_id = video.get('video_id')
            
            if video_id not in seen_ids and video.get('quality_score', 0) >= self.quality_threshold:
                seen_ids.add(video_id)
                unique_videos.append(video)
        
        return unique_videos
    
    def populate_needed_genres(self) -> Dict[str, Any]:
        """Populate only the genres that need more videos"""
        
        logger.info(f"\n🎬 SELECTIVE POPULATION STARTING")
        logger.info(f"Target: {self.target_videos_per_genre} | Threshold: {self.minimum_threshold}")
        logger.info("=" * 80)
        
        # Identify genres that need collection
        genres_to_collect = self.identify_genres_needing_collection()
        
        if not genres_to_collect:
            logger.info("🎉 All genres have sufficient videos! No collection needed.")
            return {'message': 'No genres need collection', 'genres_processed': 0}
        
        logger.info(f"\n🚀 Starting collection for {len(genres_to_collect)} genres...")
        
        start_time = time.time()
        results = []
        
        for i, genre in enumerate(genres_to_collect, 1):
            logger.info(f"\n📊 Progress: {i}/{len(genres_to_collect)} genres")
            
            # Calculate how many more videos we need
            status = self.analyze_current_status()
            target_additional = status[genre.value]['target_remaining']
            
            try:
                # Collect additional videos
                new_videos = self.collect_videos_for_genre_sync(genre, target_additional)
                
                # Load existing videos
                existing_videos = self._load_existing_genre_videos(genre)
                
                # Combine and save
                all_videos = existing_videos + new_videos
                
                result = {
                    'genre': genre.value,
                    'existing_count': len(existing_videos),
                    'new_count': len(new_videos),
                    'total_count': len(all_videos),
                    'target_count': self.target_videos_per_genre,
                    'success': True,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Save updated genre file
                genre_data = {
                    'genre': genre.value,
                    'target_count': self.target_videos_per_genre,
                    'actual_count': len(all_videos),
                    'videos': all_videos,
                    'last_updated': datetime.now().isoformat()
                }
                
                genre_file = self.results_dir / f"{genre.value}_videos.json"
                with open(genre_file, 'w', encoding='utf-8') as f:
                    json.dump(genre_data, f, indent=2, ensure_ascii=False)
                
                logger.info(f"✅ {genre.value}: {len(existing_videos)} + {len(new_videos)} = {len(all_videos)} total")
                
                results.append(result)
                
                # Brief pause between genres
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Error with {genre.value}: {e}")
                results.append({
                    'genre': genre.value,
                    'error': str(e),
                    'success': False,
                    'timestamp': datetime.now().isoformat()
                })
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        successful = [r for r in results if r.get('success', False)]
        failed = [r for r in results if not r.get('success', False)]
        
        total_new_videos = sum(r.get('new_count', 0) for r in successful)
        
        summary = {
            'total_genres_processed': len(genres_to_collect),
            'successful_genres': len(successful),
            'failed_genres': len(failed),
            'total_new_videos_collected': total_new_videos,
            'duration_minutes': round(duration / 60, 1),
            'results': results
        }
        
        # Save summary
        summary_file = self.results_dir / "selective_population_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        # Print final summary
        logger.info(f"\n{'='*80}")
        logger.info(f"🎉 SELECTIVE POPULATION COMPLETE!")
        logger.info(f"{'='*80}")
        logger.info(f"📊 Processed: {len(genres_to_collect)} genres")
        logger.info(f"✅ Successful: {len(successful)}")
        logger.info(f"❌ Failed: {len(failed)}")
        logger.info(f"🆕 New videos collected: {total_new_videos:,}")
        logger.info(f"⏱️  Total time: {duration/60:.1f} minutes")
        logger.info(f"📁 Results saved in: {self.results_dir}")
        logger.info(f"{'='*80}")
        
        return summary
    
    def _load_existing_genre_videos(self, genre: GenreCategory) -> List[Dict[str, Any]]:
        """Load existing videos for a genre"""
        
        genre_file = self.results_dir / f"{genre.value}_videos.json"
        
        if not genre_file.exists():
            return []
        
        try:
            with open(genre_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('videos', [])
        except Exception as e:
            logger.warning(f"Could not load existing videos for {genre.value}: {e}")
            return []

def main():
    """Main execution function"""
    
    print("🎯 StreamSmart Selective Genre Population Tool")
    print("=" * 60)
    print("Only collects videos for genres below the threshold")
    print()
    
    # Parse command line arguments
    target_count = 1500
    threshold = 500
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--help":
            print("Usage:")
            print("  python selective_genre_population.py                    # Use defaults (target=1500, threshold=500)")
            print("  python selective_genre_population.py 2000              # Set target count")
            print("  python selective_genre_population.py 2000 1000         # Set target and threshold")
            print("  python selective_genre_population.py --status          # Show current status only")
            print()
            print("Parameters:")
            print("  target_count: Target videos per genre (default: 1500)")
            print("  threshold: Only collect for genres below this count (default: 500)")
            return
        elif sys.argv[1] == "--status":
            populator = SelectiveGenrePopulator()
            populator.identify_genres_needing_collection()
            return
        else:
            try:
                target_count = int(sys.argv[1])
                if len(sys.argv) > 2:
                    threshold = int(sys.argv[2])
            except ValueError:
                print("Error: Arguments must be integers")
                return
    
    print(f"🎯 Target videos per genre: {target_count}")
    print(f"📊 Collection threshold: {threshold}")
    print()
    
    populator = SelectiveGenrePopulator(target_count, threshold)
    results = populator.populate_needed_genres()
    
    print(f"\n✅ Selective population complete!")
    print(f"Check results in: {populator.results_dir}")

if __name__ == "__main__":
    main()
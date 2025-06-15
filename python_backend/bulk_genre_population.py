#!/usr/bin/env python3
"""
Bulk Genre Population Script for StreamSmart
Collects 100-200 high-quality educational videos for each genre category
"""

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
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
        logging.FileHandler('bulk_population.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BulkGenrePopulator:
    def __init__(self):
        self.collector = YouTubeContentCollector()
        self.target_videos_per_genre = 2000  # Target 2000 videos per genre
        self.min_videos_per_genre = 1500     # Minimum acceptable (75% of target)
        self.quality_threshold = 0.15        # Lower threshold for more videos
        self.results_dir = Path("genre_population_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Load existing videos to avoid duplicates
        self.existing_video_ids = self._load_existing_video_ids()
        
        # All 29 genre categories from the codebase
        self.all_genres = [
            # 🎯 Skill-Based Genres (10)
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
            
            # 📚 Academic Genres (6)
            GenreCategory.MATHEMATICS,
            GenreCategory.PHYSICS,
            GenreCategory.BIOLOGY,
            GenreCategory.CHEMISTRY,
            GenreCategory.HISTORY_CIVICS,
            GenreCategory.LANGUAGE_LEARNING,
            
            # 💼 Career & Professional Development (4)
            GenreCategory.RESUME_JOB_HUNTING,
            GenreCategory.INTERVIEW_PREPARATION,
            GenreCategory.FREELANCING_REMOTE,
            GenreCategory.CERTIFICATIONS,
            
            # 🧠 Tech News & Trends (4)
            GenreCategory.TECH_NEWS,
            GenreCategory.AI_INNOVATION,
            GenreCategory.STARTUPS,
            GenreCategory.CYBERSECURITY,
            
            # 🧩 Mind-expanding & Curiosity Genres (4)
            GenreCategory.TRIVIA_FACTS,
            GenreCategory.SCIENCE_EXPERIMENTS,
            GenreCategory.PSYCHOLOGY,
            GenreCategory.PHILOSOPHY,
            
            # 🛠️ DIY & Hands-on Learning (3)
            GenreCategory.ROBOTICS_IOT,
            GenreCategory.ELECTRONICS_ARDUINO,
            GenreCategory.DIY_PROJECTS,
            
            # 🌱 Lifestyle Learning (3)
            GenreCategory.HEALTH_FITNESS,
            GenreCategory.MENTAL_WELLNESS,
            GenreCategory.SUSTAINABLE_LIVING
        ]
        
        logger.info(f"Initialized populator for {len(self.all_genres)} genre categories")
        logger.info(f"Loaded {len(self.existing_video_ids)} existing video IDs to avoid duplicates")
    
    def _load_existing_video_ids(self) -> set:
        """Load existing video IDs from all genre result files to avoid duplicates"""
        existing_ids = set()
        
        # Load from individual genre files
        for genre_file in self.results_dir.glob("*_videos.json"):
            try:
                with open(genre_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    videos = data.get('videos', [])
                    for video in videos:
                        if 'video_id' in video:
                            existing_ids.add(video['video_id'])
                logger.info(f"Loaded {len(videos)} video IDs from {genre_file.name}")
            except Exception as e:
                logger.warning(f"Could not load existing videos from {genre_file}: {e}")
        
        # Also load from complete results file if it exists
        complete_file = self.results_dir / "complete_population_results.json"
        if complete_file.exists():
            try:
                with open(complete_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    individual_results = data.get('individual_results', [])
                    for result in individual_results:
                        videos = result.get('videos', [])
                        for video in videos:
                            if 'video_id' in video:
                                existing_ids.add(video['video_id'])
            except Exception as e:
                logger.warning(f"Could not load from complete results file: {e}")
        
        return existing_ids
    
    def _load_existing_genre_videos(self, genre: GenreCategory) -> List[Dict[str, Any]]:
        """Load existing videos for a specific genre"""
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

    def collect_videos_for_genre_sync(self, genre: GenreCategory) -> List[Dict[str, Any]]:
        """Enhanced synchronous collection for 2000+ videos per genre with multiple strategies"""
        
        if genre not in self.collector.genre_queries:
            logger.warning(f"No search queries defined for genre: {genre}")
            return []
        
        all_videos = []
        queries = self.collector.genre_queries[genre]
        
        # Enhanced strategy: Multiple passes with different search depths
        videos_per_query_base = max(self.target_videos_per_genre // len(queries), 50)
        
        logger.info(f"🎯 Enhanced collection for {genre.value} using {len(queries)} search queries")
        logger.info(f"   Target: {self.target_videos_per_genre} videos | Base per query: {videos_per_query_base}")
        
        # Strategy 1: Standard search with increased depth
        for i, query in enumerate(queries, 1):
            try:
                logger.info(f"  📝 Pass 1 - Query {i}/{len(queries)}: '{query}'")
                
                # Get more videos per query for 2000 target
                raw_videos = get_videos_sync(query, videos_per_query_base * 2)
                
                query_videos = self._process_raw_videos(raw_videos, query, genre.value)
                all_videos.extend(query_videos)
                
                logger.info(f"    ✅ Pass 1: {len(query_videos)} quality videos")
                
                # Rate limiting
                time.sleep(1.5)
                
            except Exception as e:
                logger.error(f"Error with query '{query}': {e}")
                continue
        
        # Strategy 2: Enhanced queries with course/tutorial focus
        if len(all_videos) < self.target_videos_per_genre * 0.7:  # If we have less than 70% of target
            logger.info(f"  🔄 Pass 2: Enhanced queries (current: {len(all_videos)} videos)")
            
            enhanced_queries = []
            for base_query in queries[:3]:  # Use top 3 queries
                enhanced_queries.extend([
                    f"{base_query} complete course",
                    f"{base_query} full tutorial",
                    f"{base_query} comprehensive guide",
                    f"learn {base_query} step by step"
                ])
            
            for i, query in enumerate(enhanced_queries, 1):
                try:
                    logger.info(f"  📝 Pass 2 - Enhanced {i}/{len(enhanced_queries)}: '{query}'")
                    
                    raw_videos = get_videos_sync(query, videos_per_query_base)
                    query_videos = self._process_raw_videos(raw_videos, query, genre.value)
                    all_videos.extend(query_videos)
                    
                    logger.info(f"    ✅ Pass 2: {len(query_videos)} additional videos")
                    
                    time.sleep(1)
                    
                    # Check if we've reached target
                    if len(all_videos) >= self.target_videos_per_genre:
                        logger.info(f"    🎉 Reached target after enhanced queries!")
                        break
                        
                except Exception as e:
                    logger.error(f"Error with enhanced query '{query}': {e}")
                    continue
        
        # Strategy 3: Channel-based collection if still short
        if len(all_videos) < self.target_videos_per_genre * 0.8:  # If we have less than 80% of target
            logger.info(f"  🔄 Pass 3: Channel-based collection (current: {len(all_videos)} videos)")
            
            # Get videos from high-quality educational channels
            channel_queries = [
                f"{genre.value} site:youtube.com/c/freecodecamp",
                f"{genre.value} site:youtube.com/c/khanacademy", 
                f"{genre.value} site:youtube.com/c/3blue1brown",
                f"{genre.value} site:youtube.com/c/crashcourse",
                f"{genre.value} site:youtube.com/c/edureka"
            ]
            
            for query in channel_queries:
                try:
                    raw_videos = get_videos_sync(query, 100)
                    query_videos = self._process_raw_videos(raw_videos, query, genre.value)
                    all_videos.extend(query_videos)
                    
                    logger.info(f"    ✅ Channel search: {len(query_videos)} videos")
                    time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error with channel query '{query}': {e}")
                    continue
        
        # Remove duplicates and apply enhanced filtering
        unique_videos = self._deduplicate_and_filter(all_videos)
        
        # Sort by enhanced quality score
        unique_videos.sort(key=lambda x: x['quality_score'], reverse=True)
        
        # Take top videos up to target
        final_videos = unique_videos[:self.target_videos_per_genre]
        
        logger.info(f"🏆 Final result for {genre.value}: {len(final_videos)} unique videos")
        logger.info(f"   Quality distribution: High({len([v for v in final_videos if v['quality_score'] >= 0.5])}) | "
                   f"Medium({len([v for v in final_videos if 0.3 <= v['quality_score'] < 0.5])}) | "
                   f"Basic({len([v for v in final_videos if v['quality_score'] < 0.3])})")
        
        return final_videos
    
    def _process_raw_videos(self, raw_videos: list, query: str, genre: str) -> List[Dict[str, Any]]:
        """Process raw video data with enhanced filtering"""
        processed_videos = []
        
        for video_raw in raw_videos:
            try:
                video_data = self.collector._parse_video_data(video_raw)
                
                # Enhanced filtering criteria
                if video_data and self._meets_enhanced_criteria(video_data):
                    video_dict = {
                        'video_id': video_data.video_id,
                        'title': video_data.title,
                        'description': video_data.description,
                        'duration': video_data.duration,
                        'channel_name': video_data.channel_name,
                        'channel_id': video_data.channel_id,
                        'view_count': video_data.view_count,
                        'upload_date': video_data.upload_date,
                        'thumbnail_url': video_data.thumbnail_url,
                        'youtube_url': video_data.youtube_url,
                        'quality_score': video_data.quality_score,
                        'educational_indicators': video_data.educational_indicators,
                        'search_query': query,
                        'genre': genre
                    }
                    processed_videos.append(video_dict)
                    
            except Exception as e:
                logger.error(f"Error parsing video: {e}")
                continue
        
        return processed_videos
    
    def _meets_enhanced_criteria(self, video_data) -> bool:
        """Enhanced criteria for 2000-video collection with quality focus"""
        
        # Minimum view count (10K+ as discussed)
        if video_data.view_count < 10000:
            return False
        
        # Minimum duration (5+ minutes for long-form content)
        # Parse duration string to seconds
        duration_seconds = self.collector.parse_duration(video_data.duration)
        if duration_seconds < 300:  # 5 minutes
            return False
        
        # Maximum duration (4 hours to avoid extremely long content)
        if duration_seconds > 14400:  # 4 hours
            return False
        
        # Quality score threshold
        if video_data.quality_score < self.quality_threshold:
            return False
        
        # Exclude shorts and viral content
        title_lower = video_data.title.lower()
        if any(term in title_lower for term in ['#shorts', 'quick tip', 'in 60 seconds', 'viral']):
            return False
        
        return True
    
    def _deduplicate_and_filter(self, videos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicates and apply final filtering against existing videos"""
        unique_videos = []
        seen_ids = set()
        seen_titles = set()
        skipped_existing = 0
        skipped_duplicate = 0
        
        for video in videos:
            video_id = video.get('video_id', '')
            
            # Skip if already exists in our database
            if video_id in self.existing_video_ids:
                skipped_existing += 1
                continue
            
            # Skip duplicates by ID within current batch
            if video_id in seen_ids:
                skipped_duplicate += 1
                continue
            
            # Skip very similar titles (basic deduplication)
            title_normalized = video['title'].lower().strip()
            if title_normalized in seen_titles:
                skipped_duplicate += 1
                continue
            
            seen_ids.add(video_id)
            seen_titles.add(title_normalized)
            unique_videos.append(video)
        
        logger.info(f"   Deduplication: Kept {len(unique_videos)} | Skipped existing: {skipped_existing} | Skipped duplicates: {skipped_duplicate}")
        return unique_videos

    def populate_single_genre(self, genre: GenreCategory) -> Dict[str, Any]:
        """Populate a single genre and return results with incremental updates"""
        
        start_time = time.time()
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 Starting population for: {genre.value.upper()}")
        logger.info(f"{'='*60}")
        
        # Load existing videos for this genre
        existing_videos = self._load_existing_genre_videos(genre)
        logger.info(f"   Found {len(existing_videos)} existing videos for {genre.value}")
        
        try:
            # Collect new videos
            new_videos = self.collect_videos_for_genre_sync(genre)
            
            # Merge with existing videos
            all_videos = existing_videos + new_videos
            
            # Sort by quality score and take top videos up to target
            all_videos.sort(key=lambda x: x['quality_score'], reverse=True)
            final_videos = all_videos[:self.target_videos_per_genre]
            
            end_time = time.time()
            duration = end_time - start_time
            
            result = {
                'genre': genre.value,
                'target_count': self.target_videos_per_genre,
                'actual_count': len(final_videos),
                'new_videos_added': len(new_videos),
                'existing_videos_kept': len(existing_videos),
                'success': len(final_videos) >= self.min_videos_per_genre,
                'duration_seconds': round(duration, 2),
                'videos': final_videos,
                'timestamp': datetime.now().isoformat(),
                'quality_stats': self._calculate_quality_stats(final_videos)
            }
            
            # Save individual genre results
            genre_file = self.results_dir / f"{genre.value}_videos.json"
            with open(genre_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            status = "✅ SUCCESS" if result['success'] else "⚠️  PARTIAL"
            logger.info(f"{status} - {genre.value}: {len(final_videos)} total videos ({len(new_videos)} new + {len(existing_videos)} existing) in {duration:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ FAILED - {genre.value}: {e}")
            return {
                'genre': genre.value,
                'target_count': self.target_videos_per_genre,
                'actual_count': 0,
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _calculate_quality_stats(self, videos: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate quality statistics for videos"""
        if not videos:
            return {}
        
        quality_scores = [v['quality_score'] for v in videos]
        view_counts = [v['view_count'] for v in videos]
        
        return {
            'avg_quality_score': round(sum(quality_scores) / len(quality_scores), 3),
            'min_quality_score': round(min(quality_scores), 3),
            'max_quality_score': round(max(quality_scores), 3),
            'avg_view_count': round(sum(view_counts) / len(view_counts)),
            'total_view_count': sum(view_counts),
            'high_quality_count': len([s for s in quality_scores if s >= 0.5]),
            'medium_quality_count': len([s for s in quality_scores if 0.3 <= s < 0.5]),
            'basic_quality_count': len([s for s in quality_scores if s < 0.3])
        }

    def populate_all_genres(self) -> Dict[str, Any]:
        """Populate all genres and generate comprehensive report"""
        
        logger.info(f"\n🎬 STARTING BULK POPULATION FOR ALL {len(self.all_genres)} GENRES")
        logger.info(f"Target: {self.target_videos_per_genre} videos per genre")
        logger.info(f"Minimum: {self.min_videos_per_genre} videos per genre")
        logger.info(f"Quality threshold: {self.quality_threshold}")
        
        start_time = time.time()
        results = []
        
        for i, genre in enumerate(self.all_genres, 1):
            logger.info(f"\n📊 Progress: {i}/{len(self.all_genres)} genres")
            
            result = self.populate_single_genre(genre)
            results.append(result)
            
            # Brief pause between genres to avoid rate limiting
            time.sleep(2)
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        # Generate summary report
        summary = self._generate_summary_report(results, total_duration)
        
        # Save complete results
        complete_results = {
            'summary': summary,
            'individual_results': results,
            'timestamp': datetime.now().isoformat()
        }
        
        results_file = self.results_dir / "complete_population_results.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(complete_results, f, indent=2, ensure_ascii=False)
        
        # Print final summary
        self._print_final_summary(summary)
        
        return complete_results

    def _generate_summary_report(self, results: List[Dict[str, Any]], total_duration: float) -> Dict[str, Any]:
        """Generate summary statistics"""
        
        successful_genres = [r for r in results if r.get('success', False)]
        failed_genres = [r for r in results if not r.get('success', False)]
        
        total_videos = sum(r.get('actual_count', 0) for r in results)
        avg_videos_per_genre = total_videos / len(results) if results else 0
        
        return {
            'total_genres': len(self.all_genres),
            'successful_genres': len(successful_genres),
            'failed_genres': len(failed_genres),
            'success_rate': round(len(successful_genres) / len(results) * 100, 1) if results else 0,
            'total_videos_collected': total_videos,
            'average_videos_per_genre': round(avg_videos_per_genre, 1),
            'target_videos_per_genre': self.target_videos_per_genre,
            'minimum_videos_per_genre': self.min_videos_per_genre,
            'total_duration_minutes': round(total_duration / 60, 1),
            'average_time_per_genre_seconds': round(total_duration / len(results), 1) if results else 0,
            'genres_meeting_target': len([r for r in results if r.get('actual_count', 0) >= self.target_videos_per_genre]),
            'genres_meeting_minimum': len([r for r in results if r.get('actual_count', 0) >= self.min_videos_per_genre])
        }

    def _print_final_summary(self, summary: Dict[str, Any]):
        """Print a beautiful final summary"""
        
        logger.info(f"\n{'='*80}")
        logger.info(f"🎉 BULK POPULATION COMPLETE!")
        logger.info(f"{'='*80}")
        logger.info(f"📊 SUMMARY STATISTICS:")
        logger.info(f"   • Total Genres: {summary['total_genres']}")
        logger.info(f"   • Successful: {summary['successful_genres']} ({summary['success_rate']}%)")
        logger.info(f"   • Failed: {summary['failed_genres']}")
        logger.info(f"   • Total Videos: {summary['total_videos_collected']:,}")
        logger.info(f"   • Average per Genre: {summary['average_videos_per_genre']}")
        logger.info(f"   • Meeting Target ({self.target_videos_per_genre}+): {summary['genres_meeting_target']}")
        logger.info(f"   • Meeting Minimum ({self.min_videos_per_genre}+): {summary['genres_meeting_minimum']}")
        logger.info(f"   • Total Time: {summary['total_duration_minutes']} minutes")
        logger.info(f"   • Avg Time per Genre: {summary['average_time_per_genre_seconds']} seconds")
        logger.info(f"\n📁 Results saved in: {self.results_dir}")
        logger.info(f"{'='*80}")

    def populate_specific_genres(self, genre_names: List[str]) -> Dict[str, Any]:
        """Populate only specific genres by name"""
        
        # Convert genre names to GenreCategory objects
        selected_genres = []
        for name in genre_names:
            for genre in self.all_genres:
                if genre.value == name or genre.name == name.upper().replace('-', '_'):
                    selected_genres.append(genre)
                    break
            else:
                logger.warning(f"Genre '{name}' not found")
        
        if not selected_genres:
            logger.error("No valid genres found")
            return {}
        
        logger.info(f"Populating {len(selected_genres)} specific genres: {[g.value for g in selected_genres]}")
        
        # Temporarily replace all_genres for this run
        original_genres = self.all_genres
        self.all_genres = selected_genres
        
        try:
            results = self.populate_all_genres()
            return results
        finally:
            self.all_genres = original_genres

def main():
    """Main execution function"""
    
    print("🎬 StreamSmart Bulk Genre Population Tool")
    print("=" * 50)
    
    populator = BulkGenrePopulator()
    
    # Check if specific genres are requested
    if len(sys.argv) > 1:
        if sys.argv[1] == "--list":
            print("Available genres:")
            for i, genre in enumerate(populator.all_genres, 1):
                print(f"{i:2d}. {genre.value}")
            return
        elif sys.argv[1] == "--specific":
            if len(sys.argv) < 3:
                print("Usage: python bulk_genre_population.py --specific genre1 genre2 ...")
                return
            specific_genres = sys.argv[2:]
            results = populator.populate_specific_genres(specific_genres)
        elif sys.argv[1] == "--test":
            # Test with just a few genres
            test_genres = ['coding-programming', 'data-science-ai', 'mathematics']
            results = populator.populate_specific_genres(test_genres)
        else:
            print("Usage:")
            print("  python bulk_genre_population.py                    # Populate all genres")
            print("  python bulk_genre_population.py --list             # List all genres")
            print("  python bulk_genre_population.py --test             # Test with 3 genres")
            print("  python bulk_genre_population.py --specific genre1  # Populate specific genres")
            return
    else:
        # Populate all genres
        results = populator.populate_all_genres()
    
    print(f"\n✅ Population complete! Check the results in: {populator.results_dir}")

if __name__ == "__main__":
    main() 
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
        self.target_videos_per_genre = 150  # Target 150 videos per genre
        self.min_videos_per_genre = 100     # Minimum acceptable
        self.quality_threshold = 0.25       # Lower threshold for more videos
        self.results_dir = Path("genre_population_results")
        self.results_dir.mkdir(exist_ok=True)
        
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

    def collect_videos_for_genre_sync(self, genre: GenreCategory) -> List[Dict[str, Any]]:
        """Synchronously collect videos for a single genre using multiple strategies"""
        
        if genre not in self.collector.genre_queries:
            logger.warning(f"No search queries defined for genre: {genre}")
            return []
        
        all_videos = []
        queries = self.collector.genre_queries[genre]
        
        # Calculate videos per query to reach target
        videos_per_query = max(self.target_videos_per_genre // len(queries), 10)
        
        logger.info(f"🎯 Collecting videos for {genre.value} using {len(queries)} search queries")
        
        for i, query in enumerate(queries, 1):
            try:
                logger.info(f"  📝 Query {i}/{len(queries)}: '{query}' (targeting {videos_per_query} videos)")
                
                # Get videos for this query
                raw_videos = get_videos_sync(query, videos_per_query)
                
                # Parse and filter videos
                query_videos = []
                for video_raw in raw_videos:
                    try:
                        video_data = self.collector._parse_video_data(video_raw)
                        if video_data and video_data.quality_score >= self.quality_threshold:
                            # Convert to dict for JSON serialization
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
                                'genre': genre.value
                            }
                            query_videos.append(video_dict)
                            all_videos.append(video_dict)
                    except Exception as e:
                        logger.error(f"Error parsing video: {e}")
                        continue
                
                logger.info(f"    ✅ Found {len(query_videos)} quality videos for this query")
                
                # Rate limiting between queries
                time.sleep(1)
                
                # Early exit if we have enough videos
                if len(all_videos) >= self.target_videos_per_genre:
                    logger.info(f"    🎉 Reached target of {self.target_videos_per_genre} videos, stopping early")
                    break
                    
            except Exception as e:
                logger.error(f"Error with query '{query}': {e}")
                continue
        
        # Remove duplicates based on video_id
        unique_videos = []
        seen_ids = set()
        
        for video in all_videos:
            if video['video_id'] not in seen_ids:
                seen_ids.add(video['video_id'])
                unique_videos.append(video)
        
        # Sort by quality score (highest first)
        unique_videos.sort(key=lambda x: x['quality_score'], reverse=True)
        
        # Take top videos up to target
        final_videos = unique_videos[:self.target_videos_per_genre]
        
        logger.info(f"🏆 Final result for {genre.value}: {len(final_videos)} unique videos")
        return final_videos

    def populate_single_genre(self, genre: GenreCategory) -> Dict[str, Any]:
        """Populate a single genre and return results"""
        
        start_time = time.time()
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 Starting population for: {genre.value.upper()}")
        logger.info(f"{'='*60}")
        
        try:
            videos = self.collect_videos_for_genre_sync(genre)
            
            end_time = time.time()
            duration = end_time - start_time
            
            result = {
                'genre': genre.value,
                'target_count': self.target_videos_per_genre,
                'actual_count': len(videos),
                'success': len(videos) >= self.min_videos_per_genre,
                'duration_seconds': round(duration, 2),
                'videos': videos,
                'timestamp': datetime.now().isoformat(),
                'quality_stats': self._calculate_quality_stats(videos)
            }
            
            # Save individual genre results
            genre_file = self.results_dir / f"{genre.value}_videos.json"
            with open(genre_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            status = "✅ SUCCESS" if result['success'] else "⚠️  PARTIAL"
            logger.info(f"{status} - {genre.value}: {len(videos)} videos in {duration:.1f}s")
            
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
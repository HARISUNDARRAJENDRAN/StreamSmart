"""
CSV-Based Recommendation Engine
Production-ready implementation with caching, efficient filtering, and error handling
No ML dependencies - pure pandas operations for maximum performance
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
import logging
from functools import lru_cache
import hashlib
import json
from threading import Lock
import re
import ast
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CSVRecommendationAgent:
    """
    High-performance CSV-based recommendation engine.
    Designed for production use with caching, thread-safety, and efficient operations.
    """
    
    # Class-level constants for configuration
    DEFAULT_MIN_QUALITY_SCORE = 0.7
    DEFAULT_TOP_N = 10
    MAX_CACHE_SIZE = 128
    CACHE_TTL_SECONDS = 3600  # 1 hour
    _RELATIVE_DATE_PATTERN = re.compile(r"^(?P<value>\d+)\s+(?P<unit>day|days|week|weeks|month|months|year|years)\s+ago$", re.IGNORECASE)
    
    def __init__(
        self, 
        csv_path: str,
        min_quality_score: float = DEFAULT_MIN_QUALITY_SCORE,
        enable_caching: bool = True
    ):
        """
        Initialize the recommendation agent with optimized data loading
        
        Args:
            csv_path: Path to the CSV file containing video data
            min_quality_score: Minimum quality score threshold
            enable_caching: Enable result caching for better performance
        """
        self._lock = Lock()
        self._cache = {} if enable_caching else None
        self._cache_timestamps = {}
        self.min_quality_score = min_quality_score
        
        try:
            logger.info(f"Loading CSV data from {csv_path}")
            self._load_and_preprocess_data(csv_path)
            logger.info(f"Successfully loaded {len(self.df)} videos")
        except Exception as e:
            logger.error(f"Failed to load CSV data: {e}")
            raise RuntimeError(f"Failed to initialize recommendation engine: {e}")
    
    def _load_and_preprocess_data(self, csv_path: str) -> None:
        """
        Load and preprocess CSV data with optimizations
        """
        # Load CSV with optimized dtypes for memory efficiency
        dtype_spec = {
            'video_id': 'str',
            'title': 'str',
            'channel_name': 'str',
            'channel_id': 'str',
            'description': 'str',
            'genre': 'category',  # Use category for better memory usage
            'quality_score': 'float32',
            'view_count': 'int32',
            'duration': 'str',
            'thumbnail_url': 'str',
            'youtube_url': 'str',
            'upload_date': 'str',
            'educational_indicators': 'str'
        }
        
        self.df = pd.read_csv(csv_path, dtype=dtype_spec, low_memory=False)
        
        # Data quality checks and cleaning
        self._clean_data()
        
        # Apply quality filter
        self.df = self.df[self.df['quality_score'] > self.min_quality_score]
        
        # Create indexes for faster lookups
        self.df.set_index('video_id', drop=False, inplace=True)
        
        # Augment dataframe with metadata used for advanced filtering
        self._augment_metadata()

        # Precompute genre groupings for faster filtering
        self.genre_groups = self.df.groupby('genre', observed=True).groups
        
        # Calculate popularity score for better recommendations
        self._calculate_popularity_scores()
    
    def _clean_data(self) -> None:
        """
        Clean and validate data
        """
        # Handle missing values - IMPORTANT: Handle categorical 'genre' before fillna
        # First, add 'uncategorized' to the categories if it doesn't exist
        if 'uncategorized' not in self.df['genre'].cat.categories:
            self.df['genre'] = self.df['genre'].cat.add_categories(['uncategorized'])
        
        # Now we can safely fill NA values
        self.df['title'].fillna('Untitled Video', inplace=True)
        self.df['channel_name'].fillna('Unknown Channel', inplace=True)
        self.df['description'].fillna('', inplace=True)
        self.df['genre'].fillna('uncategorized', inplace=True)
        
        # Ensure numeric fields are valid
        self.df['quality_score'].fillna(0.5, inplace=True)
        self.df['view_count'].fillna(0, inplace=True)
        
        # Normalize genre names (lowercase, strip whitespace)
        # Convert to string first to avoid categorical issues
        self.df['genre'] = self.df['genre'].astype(str).str.lower().str.strip()
        # Convert back to categorical after normalization
        self.df['genre'] = self.df['genre'].astype('category')
        
        # Remove duplicates based on video_id
        self.df.drop_duplicates(subset=['video_id'], keep='first', inplace=True)
        
        # Reset educational indicators that failed parsing to empty dicts
        self.df['educational_indicators'].fillna('{}', inplace=True)
    
    def _augment_metadata(self) -> None:
        """Precompute normalized columns and metadata for production-grade filtering"""
        # Normalize key text fields once to avoid repeated lowercasing on every query
        self.df['title_normalized'] = self.df['title'].astype(str).str.lower()
        self.df['description_normalized'] = self.df['description'].astype(str).str.lower()
        self.df['channel_name_normalized'] = self.df['channel_name'].astype(str).str.lower()

        # Combine searchable text into a single corpus for keyword lookups
        self.df['search_corpus'] = (
            self.df['title_normalized'] + ' ' + self.df['description_normalized']
        ).str.strip()

        # Pre-compute duration in seconds for range-based filtering
        self.df['duration_seconds'] = self.df['duration'].apply(self._parse_duration_to_seconds).astype('int32')

        # Normalize upload date into a datetime when possible for recency filtering
        self.df['upload_datetime'] = self.df['upload_date'].apply(self._parse_upload_date)

        # Safely deserialize educational indicators and extract structured signals
        indicators = self.df['educational_indicators'].apply(self._safe_parse_indicators)
        self.df['difficulty_level'] = indicators.apply(lambda x: str(x.get('difficulty_level', 'unknown')).lower())
        self.df['estimated_learning_time'] = indicators.apply(lambda x: int(x.get('estimated_learning_time', 0) or 0))
        self.df['has_transcript'] = indicators.apply(lambda x: bool(x.get('has_transcript', False)))

        # Pre-build mappings used by search for O(1) lookups during query execution
        self._search_field_map = {
            'title': 'title_normalized',
            'description': 'description_normalized',
            'channel': 'channel_name_normalized',
            'channel_name': 'channel_name_normalized'
        }

        # Valid sort options the public API can request
        self._search_sort_options = {'relevance', 'popularity', 'recent'}

    @property
    def available_genres(self) -> List[str]:
        """Expose list of genres for clients that need to build topic groupings"""
        if hasattr(self, 'genre_groups') and self.genre_groups:
            return list(self.genre_groups.keys())
        return list(self.df['genre'].astype(str).unique())

    def _parse_duration_to_seconds(self, duration: Any) -> int:
        """Convert HH:MM:SS or MM:SS strings into seconds for duration filtering"""
        if duration is None or (isinstance(duration, float) and np.isnan(duration)):
            return 0
        if not isinstance(duration, str):
            duration = str(duration)
        duration = duration.strip()
        if not duration:
            return 0

        try:
            parts = [int(float(p)) for p in duration.split(':')]
            seconds = 0
            multiplier = 1
            for value in reversed(parts):
                seconds += value * multiplier
                multiplier *= 60
            return int(max(seconds, 0))
        except (ValueError, TypeError):
            logger.debug(f"Unable to parse duration '{duration}', defaulting to 0")
            return 0

    def _parse_upload_date(self, raw_value: Any) -> Optional[datetime]:
        """Parse relative upload dates like '2 months ago' into absolute datetimes"""
        if not isinstance(raw_value, str):
            return pd.to_datetime(raw_value, errors='coerce')

        value = raw_value.strip()
        if not value:
            return pd.NaT

        match = self._RELATIVE_DATE_PATTERN.match(value)
        if match:
            amount = int(match.group('value'))
            unit = match.group('unit').lower()
            if 'day' in unit:
                delta = timedelta(days=amount)
            elif 'week' in unit:
                delta = timedelta(weeks=amount)
            elif 'month' in unit:
                delta = timedelta(days=30 * amount)
            else:
                delta = timedelta(days=365 * amount)
            return datetime.utcnow() - delta

        parsed = pd.to_datetime(value, errors='coerce')
        if pd.isna(parsed):
            logger.debug(f"Unable to parse upload_date '{value}', leaving as NaT")
            return pd.NaT
        return parsed

    def _safe_parse_indicators(self, raw_value: Any) -> Dict[str, Any]:
        """Deserialize educational indicators column into a dict"""
        if isinstance(raw_value, dict):
            return raw_value
        if not isinstance(raw_value, str):
            return {}

        try:
            parsed = ast.literal_eval(raw_value)
            return parsed if isinstance(parsed, dict) else {}
        except (SyntaxError, ValueError):
            logger.debug("Failed to parse educational_indicators entry", exc_info=False)
            return {}

    def _calculate_popularity_scores(self) -> None:
        """
        Calculate normalized popularity scores for ranking
        """
        # Normalize view counts using log transformation to handle outliers
        self.df['log_views'] = np.log1p(self.df['view_count'])
        
        # Calculate composite popularity score (quality * normalized views)
        max_log_views = self.df['log_views'].max()
        if max_log_views > 0:
            self.df['popularity_score'] = (
                self.df['quality_score'] * 0.6 + 
                (self.df['log_views'] / max_log_views) * 0.4
            )
        else:
            self.df['popularity_score'] = self.df['quality_score']
    
    def _get_cache_key(self, method: str, **kwargs) -> str:
        """
        Generate cache key from method name and parameters
        """
        cache_data = f"{method}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[List[Dict]]:
        """
        Retrieve data from cache if valid
        """
        if not self._cache:
            return None
        
        with self._lock:
            if cache_key in self._cache:
                # Check if cache entry is still valid
                timestamp = self._cache_timestamps.get(cache_key, 0)
                if datetime.now().timestamp() - timestamp < self.CACHE_TTL_SECONDS:
                    return self._cache[cache_key]
                else:
                    # Remove stale entry
                    del self._cache[cache_key]
                    del self._cache_timestamps[cache_key]
        return None
    
    def _save_to_cache(self, cache_key: str, data: List[Dict]) -> None:
        """
        Save data to cache with timestamp
        """
        if not self._cache:
            return
        
        with self._lock:
            # Implement simple LRU by removing oldest entry if cache is full
            if len(self._cache) >= self.MAX_CACHE_SIZE:
                oldest_key = min(self._cache_timestamps, key=self._cache_timestamps.get)
                del self._cache[oldest_key]
                del self._cache_timestamps[oldest_key]
            
            self._cache[cache_key] = data
            self._cache_timestamps[cache_key] = datetime.now().timestamp()
    
    def recommend_by_genre(
        self,
        genre: str,
        top_n: int = DEFAULT_TOP_N,
        exclude_ids: Optional[List[str]] = None,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get recommendations by genre with optimized filtering
        
        Args:
            genre: Genre to filter by
            top_n: Number of recommendations to return
            exclude_ids: Video IDs to exclude from recommendations
            use_cache: Whether to use caching
        
        Returns:
            List of recommended videos
        """
        exclude_ids = exclude_ids or []
        
        # Check cache first
        if use_cache and self._cache:
            cache_key = self._get_cache_key('genre', genre=genre, top_n=top_n, exclude_ids=exclude_ids)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for genre '{genre}'")
                return cached_result
        
        # Use precomputed genre groups for faster filtering
        if genre in self.genre_groups:
            genre_indices = self.genre_groups[genre]
            filtered_df = self.df.loc[genre_indices]
        else:
            logger.warning(f"Genre '{genre}' not found, returning empty list")
            return []
        
        # Exclude specified video IDs
        if exclude_ids:
            filtered_df = filtered_df[~filtered_df.index.isin(exclude_ids)]
        
        # Sort by popularity score for best recommendations
        sorted_df = filtered_df.nlargest(top_n, 'popularity_score')
        
        # Convert to list of dictionaries with proper field mapping
        result = self._format_recommendations(sorted_df)
        
        # Save to cache
        if use_cache and self._cache:
            self._save_to_cache(cache_key, result)
        
        return result
    
    def _format_recommendations(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Format dataframe rows to match API response schema
        Converts CSV column names to camelCase field names expected by frontend
        """
        records = df.to_dict('records')
        formatted = []
        
        for record in records:
            formatted.append({
                'video_id': record.get('video_id', ''),
                'title': record.get('title', 'Untitled'),
                'channelName': record.get('channel_name', 'Unknown'),
                'channelId': record.get('channel_id', ''),
                'thumbnailUrl': record.get('thumbnail_url', ''),
                'duration': record.get('duration', '0:00'),
                'genre': record.get('genre', 'uncategorized'),
                'qualityScore': float(record.get('quality_score', 0.5)),
                'viewCount': int(record.get('view_count', 0)),
                'popularityScore': float(record.get('popularity_score', 0.0)),
                'popularity_score': float(record.get('popularity_score', 0.0)),
                'youtubeUrl': record.get('youtube_url', f"https://youtube.com/watch?v={record.get('video_id', '')}"),
                'description': record.get('description', ''),
                'uploadDate': record.get('upload_date', '')
            })
        
        return formatted
    
    def recommend_by_user_history(
        self,
        user_genres: List[str],
        watched_ids: List[str],
        top_n: int = DEFAULT_TOP_N,
        diversity_weight: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Personalized recommendations based on user watch history
        
        Args:
            user_genres: List of genres the user has watched
            watched_ids: List of video IDs the user has already watched
            top_n: Number of recommendations to return
            diversity_weight: Weight for genre diversity (0-1)
        
        Returns:
            List of recommended videos
        """
        if not user_genres:
            # Fall back to trending videos
            return self.get_trending_videos(top_n=top_n, exclude_ids=watched_ids)
        
        # Calculate genre preferences from history
        genre_counts = pd.Series(user_genres).value_counts()
        genre_weights = genre_counts / genre_counts.sum()
        
        recommendations = []
        videos_per_genre = max(1, int(top_n / len(genre_weights)))
        
        # Get recommendations from each genre proportionally
        for genre, weight in genre_weights.items():
            # Adjust number of videos based on preference weight
            n_videos = max(1, int(top_n * weight * (1 - diversity_weight) + 
                                 videos_per_genre * diversity_weight))
            
            genre_recs = self.recommend_by_genre(
                genre=genre,
                top_n=n_videos,
                exclude_ids=watched_ids + [r['video_id'] for r in recommendations],
                use_cache=True
            )
            recommendations.extend(genre_recs)
        
        # Sort by popularity and limit to top_n
        recommendations.sort(key=lambda x: x.get('popularity_score', 0), reverse=True)
        return recommendations[:top_n]
    
    def search_by_keywords(
        self,
        keywords: Optional[List[str]],
        top_n: int = DEFAULT_TOP_N,
        search_fields: Optional[List[str]] = None,
        genres: Optional[List[str]] = None,
        channels: Optional[List[str]] = None,
        min_quality_score: Optional[float] = None,
        duration_range: Optional[Tuple[Optional[int], Optional[int]]] = None,
        difficulty_levels: Optional[List[str]] = None,
        uploaded_after: Optional[datetime] = None,
        sort_by: str = 'relevance'
    ) -> List[Dict[str, Any]]:
        """Production-grade keyword search with rich filtering and scoring"""
        normalized_keywords = [kw.strip().lower() for kw in (keywords or []) if kw and kw.strip()]
        normalized_genres = [genre.strip().lower() for genre in (genres or []) if genre and genre.strip()]
        normalized_channels = [channel.strip().lower() for channel in (channels or []) if channel and channel.strip()]
        normalized_difficulties = [level.strip().lower() for level in (difficulty_levels or []) if level and level.strip()]

        # Prevent unbounded queries that could return the entire catalogue accidentally
        if not (normalized_keywords or normalized_genres or normalized_channels or normalized_difficulties or duration_range or min_quality_score or uploaded_after):
            logger.debug("Search requested without filters; returning empty result to avoid full scan")
            return []

        # Normalize search field inputs to supported aliases
        resolved_fields = []
        for field in (search_fields or ['title', 'description']):
            column = self._search_field_map.get(field.lower())
            if column:
                resolved_fields.append((field.lower(), column))

        if normalized_keywords and not resolved_fields:
            logger.debug("No valid search fields provided; defaulting to title/description")
            resolved_fields = [('title', self._search_field_map['title']), ('description', self._search_field_map['description'])]

        # Build cache key to reuse popular queries when caching is enabled
        cache_key = None
        if self._cache is not None:
            cache_key = self._get_cache_key(
                'search',
                keywords=normalized_keywords,
                top_n=top_n,
                fields=[f for f, _ in resolved_fields],
                genres=normalized_genres,
                channels=normalized_channels,
                min_quality=min_quality_score,
                duration_range=duration_range,
                difficulty=normalized_difficulties,
                uploaded_after=uploaded_after.isoformat() if isinstance(uploaded_after, datetime) else None,
                sort_by=sort_by
            )
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached

        # Start with all candidates and progressively narrow down
        working_df = self.df
        relevance_scores = pd.Series(0.0, index=self.df.index)

        if normalized_keywords and resolved_fields:
            escaped_keywords = [re.escape(keyword) for keyword in normalized_keywords]
            pattern = '|'.join(escaped_keywords)
            keyword_mask = pd.Series(False, index=self.df.index)

            for field_name, column in resolved_fields:
                matches = working_df[column].str.contains(pattern, na=False, regex=True)
                if matches.any():
                    keyword_mask = keyword_mask | matches
                    weight = 1.0 if field_name == 'title' else 0.8 if field_name.startswith('channel') else 0.6
                    relevance_scores += matches.astype(float) * weight

            if not keyword_mask.any():
                return []

            working_df = working_df[keyword_mask].copy()
        else:
            working_df = working_df.copy()

        if normalized_genres:
            working_df = working_df[working_df['genre'].isin(normalized_genres)]

        if normalized_channels:
            working_df = working_df[working_df['channel_name_normalized'].isin(normalized_channels)]

        if normalized_difficulties:
            working_df = working_df[working_df['difficulty_level'].isin(normalized_difficulties)]

        if min_quality_score is not None:
            working_df = working_df[working_df['quality_score'] >= float(min_quality_score)]

        if duration_range:
            min_duration, max_duration = duration_range
            if min_duration is not None:
                working_df = working_df[working_df['duration_seconds'] >= int(min_duration)]
            if max_duration is not None and max_duration > 0:
                working_df = working_df[working_df['duration_seconds'] <= int(max_duration)]

        if uploaded_after is not None:
            working_df = working_df[working_df['upload_datetime'].notna()]
            working_df = working_df[working_df['upload_datetime'] >= uploaded_after]

        if working_df.empty:
            return []

        # Attach relevance scores only for selected subset to avoid reindex mismatches
        working_df = working_df.assign(relevance_score=relevance_scores.reindex(working_df.index).fillna(0))

        sort_option = sort_by.lower() if sort_by else 'relevance'
        if sort_option not in self._search_sort_options:
            logger.debug(f"Unsupported sort option '{sort_option}', defaulting to relevance")
            sort_option = 'relevance'

        if sort_option == 'recent':
            working_df = working_df.sort_values(by='upload_datetime', ascending=False, na_position='last')
        elif sort_option == 'popularity':
            working_df = working_df.sort_values(by='popularity_score', ascending=False)
        else:
            if normalized_keywords:
                # Blend textual relevance and popularity for balanced ranking when keywords are present
                working_df = working_df.assign(
                    final_score=(working_df['relevance_score'] * 0.7) + (working_df['popularity_score'] * 0.3)
                ).sort_values(by='final_score', ascending=False)
            else:
                # Without keywords, fall back to a pure popularity ordering
                working_df = working_df.sort_values(by='popularity_score', ascending=False)

        top_results = working_df.head(top_n)

        # Drop helper columns to avoid surprising clients relying on dataframe conversions elsewhere
        sanitized = top_results.drop(columns=['relevance_score'], errors='ignore')
        if 'final_score' in sanitized.columns:
            sanitized = sanitized.drop(columns=['final_score'], errors='ignore')

        payload = self._format_recommendations(sanitized)

        if cache_key and self._cache is not None:
            self._save_to_cache(cache_key, payload)

        return payload

    # ======== Smart Feed & Discovery Utilities ========

    def _normalize_exclude_ids(self, exclude_ids: Optional[List[str]]) -> List[str]:
        return [vid for vid in (exclude_ids or []) if vid]

    def _filter_exclusions(self, df: pd.DataFrame, exclude_ids: List[str]) -> pd.DataFrame:
        if not exclude_ids:
            return df
        return df[~df.index.isin(exclude_ids)]

    def _get_top_genres(self, user_genres: List[str], limit: int = 5) -> List[str]:
        if not user_genres:
            return []
        genre_counts = Counter([genre.strip().lower() for genre in user_genres if genre])
        return [genre for genre, _ in genre_counts.most_common(limit)]

    def _fetch_recommendations_for_genres(
        self,
        genres: List[str],
        per_genre: int,
        exclude_ids: List[str]
    ) -> List[Dict[str, Any]]:
        recs: List[Dict[str, Any]] = []
        seen = set(exclude_ids)
        for genre in genres:
            if genre not in self.genre_groups:
                continue
            genre_indices = self.genre_groups[genre]
            filtered = self._filter_exclusions(self.df.loc[genre_indices], list(seen))
            if filtered.empty:
                continue
            top_df = filtered.nlargest(per_genre, 'popularity_score')
            formatted = self._format_recommendations(top_df)
            for item in formatted:
                if item['video_id'] not in seen:
                    recs.append(item)
                    seen.add(item['video_id'])
        return recs

    def get_trending_in_genres(
        self,
        genres: List[str],
        top_n: int = DEFAULT_TOP_N,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Return trending videos scoped to the supplied genres."""
        normalized_genres = [g for g in (genres or []) if g]
        if not normalized_genres:
            return self.get_trending_videos(top_n=top_n, exclude_ids=exclude_ids)

        exclude = self._normalize_exclude_ids(exclude_ids)
        candidate_df = self.df[self.df['genre'].isin(normalized_genres)]
        candidate_df = self._filter_exclusions(candidate_df, exclude)
        if candidate_df.empty:
            return []

        trending_df = candidate_df.nlargest(top_n, 'popularity_score')
        return self._format_recommendations(trending_df)

    def get_discovery_recommendations(
        self,
        preferred_genres: List[str],
        top_n: int = DEFAULT_TOP_N,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Surface high-quality videos outside the user's primary genres."""
        exclude = self._normalize_exclude_ids(exclude_ids)
        preferred = {g for g in preferred_genres if g}
        discovery_df = self.df[~self.df['genre'].isin(preferred)]
        discovery_df = self._filter_exclusions(discovery_df, exclude)
        if discovery_df.empty:
            return []
        sampled_df = discovery_df.nlargest(top_n * 2, 'popularity_score')
        return self._format_recommendations(sampled_df.head(top_n))

    def build_smart_feed(
        self,
        user_genres: List[str],
        watched_ids: List[str],
        total_limit: int = 50
    ) -> Dict[str, Any]:
        """
        Construct a multi-rail smart feed tuned to the user's interests.
        Returns a dictionary with named sections and associated recommendations.
        """
        exclude = self._normalize_exclude_ids(watched_ids)
        top_genres = self._get_top_genres(user_genres, limit=6)

        section_targets = {
            'continue_learning': max(6, int(total_limit * 0.2)),
            'recommended': max(10, int(total_limit * 0.3)),
            'trending': max(10, int(total_limit * 0.25)),
            'discover': max(8, int(total_limit * 0.2))
        }

        continue_genres = top_genres[:3] if top_genres else self.available_genres[:3]
        per_genre = max(2, section_targets['continue_learning'] // max(len(continue_genres) or 1, 1))
        continue_learning = self._fetch_recommendations_for_genres(
            continue_genres,
            per_genre=per_genre,
            exclude_ids=exclude
        )

        recommended = self.recommend_by_user_history(
            user_genres=top_genres or self.available_genres[:3],
            watched_ids=exclude,
            top_n=section_targets['recommended']
        )

        trending = self.get_trending_in_genres(
            genres=top_genres or self.available_genres[:5],
            top_n=section_targets['trending'],
            exclude_ids=exclude
        )

        discovery = self.get_discovery_recommendations(
            preferred_genres=top_genres,
            top_n=section_targets['discover'],
            exclude_ids=exclude + [item['video_id'] for item in recommended]
        )

        return {
            'continue_learning': continue_learning[:section_targets['continue_learning']],
            'recommended': recommended[:section_targets['recommended']],
            'trending': trending[:section_targets['trending']],
            'discover': discovery[:section_targets['discover']],
            'metadata': {
                'preferred_genres': top_genres,
                'watch_history_count': len(exclude),
                'generated_at': datetime.utcnow().isoformat() + 'Z'
            }
        }

    # ======== Topic Explorer & Creator Hub ========

    def _extract_top_keywords(
        self,
        series: pd.Series,
        limit: int = 8,
        min_length: int = 4
    ) -> List[str]:
        tokens: Counter = Counter()
        for text in series.dropna().astype(str):
            for token in re.findall(r"[A-Za-z0-9]+", text.lower()):
                if len(token) >= min_length and token not in {'https', 'http'}:
                    tokens[token] += 1
        return [word for word, _ in tokens.most_common(limit)]

    def get_topic_hierarchy(
        self,
        max_topics: int = 12,
        samples_per_topic: int = 6
    ) -> Dict[str, Any]:
        """Generate a dynamic topic hierarchy from the dataset."""
        grouped = (
            self.df.groupby('genre')
            .agg(
                video_count=('video_id', 'count'),
                avg_quality=('quality_score', 'mean'),
                total_views=('view_count', 'sum')
            )
            .sort_values(by=['video_count', 'avg_quality'], ascending=False)
        )

        topics = []
        for genre, row in grouped.head(max_topics).iterrows():
            topic_df = self.df[self.df['genre'] == genre]
            keywords = self._extract_top_keywords(
                topic_df['title'] + ' ' + topic_df['description'],
                limit=8
            )
            samples = self._format_recommendations(
                topic_df.nlargest(samples_per_topic, 'popularity_score')
            )
            topics.append({
                'id': genre,
                'title': genre.replace('-', ' ').title(),
                'video_count': int(row['video_count']),
                'average_quality_score': float(row['avg_quality']),
                'total_views': int(row['total_views']),
                'top_keywords': keywords,
                'sample_videos': samples,
            })

        return {
            'topics': topics,
            'total_topics': len(topics),
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }

    def get_top_creators(
        self,
        genre: Optional[str] = None,
        sort_by: str = 'quality',
        limit: int = 20,
        min_videos: int = 2
    ) -> List[Dict[str, Any]]:
        """Aggregate creator performance metrics with optional genre filtering."""
        if genre:
            filtered = self.df[self.df['genre'] == genre]
        else:
            filtered = self.df

        if filtered.empty:
            return []

        aggregated = filtered.groupby('channel_name').agg(
            channel_id=('channel_id', 'first'),
            video_count=('video_id', 'count'),
            average_quality=('quality_score', 'mean'),
            total_views=('view_count', 'sum'),
            genres=('genre', lambda x: sorted(list(set(x))))
        )

        aggregated = aggregated[aggregated['video_count'] >= max(1, min_videos)]
        if aggregated.empty:
            return []

        sort_column = {
            'quality': 'average_quality',
            'views': 'total_views',
            'videos': 'video_count'
        }.get(sort_by.lower(), 'average_quality')

        aggregated = aggregated.sort_values(by=sort_column, ascending=False)

        creators = []
        for channel_name, row in aggregated.head(limit).iterrows():
            channel_df = filtered[filtered['channel_name'] == channel_name]
            sample_videos = self._format_recommendations(
                channel_df.nlargest(5, 'popularity_score')
            )
            creators.append({
                'channel_name': channel_name,
                'channel_id': row['channel_id'],
                'video_count': int(row['video_count']),
                'average_quality_score': float(row['average_quality']),
                'total_views': int(row['total_views']),
                'genres': list(row['genres']),
                'top_videos': sample_videos,
            })

        return creators
    
    def get_trending_videos(
        self,
        top_n: int = DEFAULT_TOP_N,
        genre: Optional[str] = None,
        exclude_ids: Optional[List[str]] = None,
        time_window_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get trending videos with optional genre filter
        
        Args:
            top_n: Number of videos to return
            genre: Optional genre filter
            exclude_ids: Video IDs to exclude
            time_window_days: Consider videos uploaded within this time window
        
        Returns:
            List of trending videos
        """
        exclude_ids = exclude_ids or []
        
        # Filter by genre if specified
        if genre:
            if genre in self.genre_groups:
                filtered_df = self.df.loc[self.genre_groups[genre]]
            else:
                return []
        else:
            filtered_df = self.df
        
        # Exclude specified IDs
        if exclude_ids:
            filtered_df = filtered_df[~filtered_df.index.isin(exclude_ids)]
        
        # Sort by popularity score
        trending_df = filtered_df.nlargest(top_n, 'popularity_score')
        
        return self._format_recommendations(trending_df)
    
    def get_similar_videos(
        self,
        video_id: str,
        top_n: int = DEFAULT_TOP_N,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Find similar videos based on genre and other metadata
        
        Args:
            video_id: ID of the reference video
            top_n: Number of similar videos to return
            similarity_threshold: Minimum similarity score
        
        Returns:
            List of similar videos
        """
        if video_id not in self.df.index:
            logger.warning(f"Video ID '{video_id}' not found")
            return []
        
        reference_video = self.df.loc[video_id]
        
        # Get videos from the same genre
        genre = reference_video['genre']
        similar_videos = self.recommend_by_genre(
            genre=genre,
            top_n=top_n * 2,  # Get more candidates for filtering
            exclude_ids=[video_id],
            use_cache=True
        )
        
        # Further filter by channel or other criteria if needed
        # For now, return top N from same genre
        return similar_videos[:top_n]
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the recommendation dataset
        
        Returns:
            Dictionary containing dataset statistics
        """
        return {
            'total_videos': len(self.df),
            'total_genres': self.df['genre'].nunique(),
            'genres': list(self.df['genre'].unique()),
            'avg_quality_score': float(self.df['quality_score'].mean()),
            'avg_view_count': int(self.df['view_count'].mean()),
            'cache_size': len(self._cache) if self._cache else 0,
            'min_quality_threshold': self.min_quality_score
        }
    
    def refresh_data(self, csv_path: str) -> None:
        """
        Refresh the dataset from CSV file
        
        Args:
            csv_path: Path to the updated CSV file
        """
        logger.info("Refreshing recommendation data...")
        self._load_and_preprocess_data(csv_path)
        
        # Clear cache after refresh
        if self._cache:
            with self._lock:
                self._cache.clear()
                self._cache_timestamps.clear()
        
        logger.info("Data refresh complete")

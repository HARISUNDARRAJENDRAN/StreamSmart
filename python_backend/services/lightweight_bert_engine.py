import pandas as pd
import numpy as np
import re
import os
import logging
from typing import List, Dict, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
from datetime import datetime
import json
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LightweightBertEngine:
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017/", db_name: str = "streamsmart"):
        """
        Lightweight BERT-based recommendation engine using sentence transformers
        
        Args:
            mongo_uri: MongoDB connection URI
            db_name: Database name
        """
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.client = MongoClient(mongo_uri) if mongo_uri else None
        self.db = self.client[db_name] if self.client else None
        
        # Initialize sentence transformer (lightweight)
        self.model = None
        self.df_yt = None
        self.embeddings_cache = {}
        
        # Dataset path
        self.dataset_path = "educational_youtube_content.csv"
        self.embeddings_cache_path = "embeddings_cache.pkl"
        
        self._initialize_model()
    
    def _initialize_model(self):
        """Load sentence transformer model (lightweight alternative to BERT)"""
        try:
            # Try importing sentence transformers
            from sentence_transformers import SentenceTransformer
            logger.info("Loading lightweight sentence transformer...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')  # Small, fast model
            logger.info("Lightweight model loaded successfully")
        except ImportError:
            logger.warning("Sentence transformers not available, using TF-IDF fallback")
            self._initialize_tfidf_fallback()
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._initialize_tfidf_fallback()
    
    def _initialize_tfidf_fallback(self):
        """Fallback to TF-IDF if sentence transformers not available"""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.model = TfidfVectorizer(max_features=1000, stop_words='english')
            self.model_type = 'tfidf'
            logger.info("TF-IDF fallback model initialized")
        except ImportError:
            logger.error("Both sentence transformers and sklearn not available")
            self.model = None
            self.model_type = 'none'
    
    def load_and_preprocess_dataset(self):
        """Load and preprocess the dataset"""
        try:
            # Check if dataset exists
            if not os.path.exists(self.dataset_path):
                self._create_sample_dataset()
            
            logger.info("Loading dataset...")
            self.df_yt = pd.read_csv(self.dataset_path)
            
            # Data preprocessing and cleaning
            logger.info("Preprocessing dataset...")
            
            # Clean titles
            self.df_yt['clean_title'] = self.df_yt['title'].apply(
                lambda x: re.sub(r'[^a-zA-Z0-9\s]', ' ', x) if isinstance(x, str) else ' '
            )
            
            # Convert to lowercase and strip extra spaces
            self.df_yt['clean_title'] = self.df_yt['clean_title'].str.lower().str.strip()
            self.df_yt['clean_title'] = self.df_yt['clean_title'].str.replace(r'\s+', ' ', regex=True)
            
            # Handle missing values
            self.df_yt['clean_title'] = self.df_yt['clean_title'].fillna('')
            self.df_yt['genre'] = self.df_yt['genre'].fillna('General')
            
            # Ensure required columns exist
            if 'channel_name' not in self.df_yt.columns and 'channelTitle' in self.df_yt.columns:
                self.df_yt['channel_name'] = self.df_yt['channelTitle']
            if 'thumbnail_url' not in self.df_yt.columns and 'thumbnail_link' in self.df_yt.columns:
                self.df_yt['thumbnail_url'] = self.df_yt['thumbnail_link']
            
            # Add missing columns with default values
            if 'likes' not in self.df_yt.columns:
                self.df_yt['likes'] = self.df_yt.get('view_count', 0) * 0.1
            if 'dislikes' not in self.df_yt.columns:
                self.df_yt['dislikes'] = self.df_yt.get('likes', 0) * 0.05
            
            # Remove empty titles
            self.df_yt = self.df_yt[self.df_yt['clean_title'].str.len() > 0]
            
            logger.info(f"Dataset loaded and preprocessed: {len(self.df_yt)} videos")
            return True
            
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            return False
    
    def _create_sample_dataset(self):
        """Create a sample dataset if main dataset not available"""
        logger.info("Creating sample dataset...")
        sample_data = {
            'title': [
                'Introduction to Machine Learning - Complete Course',
                'Python Programming for Beginners - Full Tutorial',
                'Data Science with Python - Pandas and NumPy',
                'JavaScript Fundamentals - ES6 and Beyond',
                'React.js Tutorial for Beginners',
                'Understanding Neural Networks and Deep Learning',
                'Statistics for Data Science - Complete Guide',
                'Web Development with HTML, CSS, and JavaScript',
                'Database Design and SQL Fundamentals',
                'Algorithms and Data Structures in Python'
            ],
            'channel_name': [
                'Tech Education Hub', 'Python Academy', 'Data Science Pro',
                'JavaScript Mastery', 'React Learning', 'AI Education',
                'Stats Academy', 'Web Dev Pro', 'Database Expert', 'Algorithm Academy'
            ],
            'view_count': [15000, 12000, 8000, 10000, 9000, 20000, 7000, 11000, 6000, 14000],
            'likes': [1500, 1200, 800, 1000, 900, 2000, 700, 1100, 600, 1400],
            'dislikes': [20, 15, 10, 18, 12, 25, 9, 16, 8, 20],
            'thumbnail_url': [f'https://img.youtube.com/vi/sample{i}/maxresdefault.jpg' for i in range(1, 11)],
            'genre': [
                'Data Science & AI/ML', 'Coding & Programming', 'Data Science & AI/ML',
                'Coding & Programming', 'Coding & Programming', 'Data Science & AI/ML',
                'Mathematics', 'Coding & Programming', 'Coding & Programming', 'Coding & Programming'
            ]
        }
        
        df = pd.DataFrame(sample_data)
        df.to_csv(self.dataset_path, index=False)
        logger.info("Sample dataset created successfully")
    
    def get_embeddings(self, text: str) -> np.ndarray:
        """Get embeddings for text using available model"""
        if self.model is None:
            return np.random.random(384)  # Fallback random vector
        
        try:
            if hasattr(self.model, 'encode'):  # Sentence transformer
                return self.model.encode([text])[0]
            elif hasattr(self.model, 'transform'):  # TF-IDF
                return self.model.transform([text]).toarray()[0]
            else:
                return np.random.random(384)
        except Exception as e:
            logger.error(f"Error getting embeddings: {e}")
            return np.random.random(384)
    
    def compute_all_embeddings(self):
        """Compute embeddings for all videos"""
        if self.df_yt is None:
            logger.error("Dataset not loaded")
            return False
        
        try:
            logger.info("Computing embeddings for all videos...")
            
            # Prepare texts for embedding
            texts = self.df_yt['clean_title'].tolist()
            
            if hasattr(self.model, 'encode'):  # Sentence transformer
                embeddings = self.model.encode(texts, show_progress_bar=True)
            elif hasattr(self.model, 'fit_transform'):  # TF-IDF
                embeddings = self.model.fit_transform(texts).toarray()
            else:
                embeddings = np.random.random((len(texts), 384))
            
            # Store embeddings
            for i, embedding in enumerate(embeddings):
                title = self.df_yt.iloc[i]['clean_title']
                self.embeddings_cache[title] = embedding
            
            logger.info(f"Computed embeddings for {len(embeddings)} videos")
            return True
            
        except Exception as e:
            logger.error(f"Error computing embeddings: {e}")
            return False
    
    def recommend_videos(self, title: str, top_n: int = 5, genre_filter: Optional[str] = None, user_id: Optional[str] = None) -> pd.DataFrame:
        """Get content-based recommendations"""
        try:
            if self.df_yt is None or len(self.embeddings_cache) == 0:
                return pd.DataFrame()
            
            # Clean input title
            clean_input = re.sub(r'[^a-zA-Z0-9\s]', ' ', title).lower().strip()
            clean_input = re.sub(r'\s+', ' ', clean_input)
            
            # Get embedding for input
            input_embedding = self.get_embeddings(clean_input)
            
            # Calculate similarities
            similarities = []
            for _, row in self.df_yt.iterrows():
                cached_embedding = self.embeddings_cache.get(row['clean_title'])
                if cached_embedding is not None:
                    similarity = cosine_similarity([input_embedding], [cached_embedding])[0][0]
                    similarities.append((row, similarity))
            
            # Sort by similarity
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Filter by genre if specified
            if genre_filter:
                similarities = [(row, sim) for row, sim in similarities if genre_filter.lower() in row['genre'].lower()]
            
            # Get top recommendations
            top_recommendations = similarities[:top_n]
            
            # Convert to DataFrame
            recommendations_data = []
            for row, similarity in top_recommendations:
                recommendations_data.append({
                    'title': row['title'],
                    'channelTitle': row.get('channel_name', 'Unknown'),
                    'likes': int(row.get('likes', 0)),
                    'dislikes': int(row.get('dislikes', 0)),
                    'thumbnail_link': row.get('thumbnail_url', ''),
                    'genre': row.get('genre', 'General'),
                    'similarity': similarity
                })
            
            return pd.DataFrame(recommendations_data)
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return pd.DataFrame()
    
    def get_genre_recommendations(self, genre: str, top_n: int = 10, user_id: Optional[str] = None) -> pd.DataFrame:
        """Get genre-based recommendations"""
        try:
            if self.df_yt is None:
                return pd.DataFrame()
            
            # Filter by genre
            genre_videos = self.df_yt[self.df_yt['genre'].str.contains(genre, case=False, na=False)]
            
            # Sort by likes/popularity
            genre_videos = genre_videos.sort_values('likes', ascending=False)
            
            # Get top N
            top_videos = genre_videos.head(top_n)
            
            # Convert to expected format
            recommendations = []
            for _, row in top_videos.iterrows():
                recommendations.append({
                    'title': row['title'],
                    'channelTitle': row.get('channel_name', 'Unknown'),
                    'likes': int(row.get('likes', 0)),
                    'dislikes': int(row.get('dislikes', 0)),
                    'thumbnail_link': row.get('thumbnail_url', ''),
                    'genre': row.get('genre', 'General')
                })
            
            return pd.DataFrame(recommendations)
            
        except Exception as e:
            logger.error(f"Error getting genre recommendations: {e}")
            return pd.DataFrame()
    
    def get_popular_recommendations(self, top_n: int = 10) -> pd.DataFrame:
        """Get popular video recommendations"""
        try:
            if self.df_yt is None:
                return pd.DataFrame()
            
            # Sort by likes
            popular_videos = self.df_yt.sort_values('likes', ascending=False).head(top_n)
            
            recommendations = []
            for _, row in popular_videos.iterrows():
                recommendations.append({
                    'title': row['title'],
                    'channelTitle': row.get('channel_name', 'Unknown'),
                    'likes': int(row.get('likes', 0)),
                    'dislikes': int(row.get('dislikes', 0)),
                    'thumbnail_link': row.get('thumbnail_url', ''),
                    'genre': row.get('genre', 'General')
                })
            
            return pd.DataFrame(recommendations)
            
        except Exception as e:
            logger.error(f"Error getting popular recommendations: {e}")
            return pd.DataFrame()
    
    def initialize_system(self):
        """Initialize the recommendation system"""
        try:
            logger.info("Initializing lightweight BERT system...")
            
            # Load dataset
            if not self.load_and_preprocess_dataset():
                return False
            
            # Compute embeddings
            if not self.compute_all_embeddings():
                return False
            
            logger.info("Lightweight BERT system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing system: {e}")
            return False
    
    def get_system_stats(self) -> Dict:
        """Get system statistics"""
        try:
            if self.df_yt is None:
                return {
                    "total_videos": 0,
                    "unique_genres": 0,
                    "genres": {},
                    "cached_embeddings": 0,
                    "system_status": "not_initialized"
                }
            
            genres = self.df_yt['genre'].value_counts().to_dict()
            
            return {
                "total_videos": len(self.df_yt),
                "unique_genres": len(genres),
                "genres": genres,
                "cached_embeddings": len(self.embeddings_cache),
                "system_status": "initialized",
                "model_type": getattr(self, 'model_type', 'sentence_transformer')
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"system_status": "error"}

# Global instance
_bert_engine = None

def get_lightweight_bert_engine():
    """Get the global BERT engine instance"""
    global _bert_engine
    if _bert_engine is None:
        mongo_uri = os.getenv("MONGO_URI")
        _bert_engine = LightweightBertEngine(mongo_uri)
    return _bert_engine 
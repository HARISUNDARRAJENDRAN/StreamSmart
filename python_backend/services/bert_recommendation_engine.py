import pandas as pd
import numpy as np
import re
import os
import logging
from typing import List, Dict, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from transformers import BertTokenizer, TFBertModel
import tensorflow as tf
from pymongo import MongoClient
from datetime import datetime
import json
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BertRecommendationEngine:
    def __init__(self, mongo_uri: str = "mongodb://localhost:27017/", db_name: str = "streamsmart"):
        """
        Initialize the BERT-based recommendation engine
        
        Args:
            mongo_uri: MongoDB connection URI
            db_name: Database name
        """
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        
        # Initialize BERT model and tokenizer
        self.tokenizer = None
        self.model = None
        self.df_yt = None
        self.embeddings_cache = {}
        
        # Dataset path
        self.dataset_path = "educational_youtube_content.csv"
        self.embeddings_cache_path = "embeddings_cache.pkl"
        
        self._initialize_bert_model()
    
    def _initialize_bert_model(self):
        """Load BERT model and tokenizer"""
        try:
            logger.info("Loading BERT model and tokenizer...")
            self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
            self.model = TFBertModel.from_pretrained('bert-base-uncased')
            logger.info("BERT model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading BERT model: {e}")
            raise
    
    def download_dataset(self):
        """Download the dataset from Kaggle"""
        try:
            # Load environment variables
            from dotenv import load_dotenv
            load_dotenv()
            
            # Set up Kaggle credentials
            import os
            username = os.getenv('KAGGLE_USERNAME')
            key = os.getenv('KAGGLE_KEY')
            
            if username and key:
                os.environ['KAGGLE_USERNAME'] = username
                os.environ['KAGGLE_KEY'] = key
            
            import kaggle
            logger.info("Downloading dataset from Kaggle...")
            kaggle.api.dataset_download_files(
                'harisundarrajendran/educational-youtube-content-dataset',
                path='.',
                unzip=True
            )
            logger.info("Dataset downloaded successfully")
        except Exception as e:
            logger.error(f"Error downloading dataset: {e}")
            # If Kaggle download fails, we'll create a sample dataset
            self._create_sample_dataset()
    
    def _create_sample_dataset(self):
        """Create a sample dataset if Kaggle download fails"""
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
                'Tech Education Hub',
                'Python Academy',
                'Data Science Pro',
                'JavaScript Mastery',
                'React Learning',
                'AI Education',
                'Stats Academy',
                'Web Dev Pro',
                'Database Expert',
                'Algorithm Academy'
            ],
            'view_count': [15000, 12000, 8000, 10000, 9000, 20000, 7000, 11000, 6000, 14000],
            'likes': [1500, 1200, 800, 1000, 900, 2000, 700, 1100, 600, 1400],
            'dislikes': [20, 15, 10, 18, 12, 25, 9, 16, 8, 20],
            'thumbnail_url': [
                'https://img.youtube.com/vi/sample1/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample2/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample3/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample4/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample5/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample6/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample7/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample8/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample9/maxresdefault.jpg',
                'https://img.youtube.com/vi/sample10/maxresdefault.jpg'
            ],
            'genre': [
                'Data Science & AI/ML',
                'Coding & Programming',
                'Data Science & AI/ML',
                'Coding & Programming',
                'Coding & Programming',
                'Data Science & AI/ML',
                'Mathematics',
                'Coding & Programming',
                'Coding & Programming',
                'Coding & Programming'
            ]
        }
        
        df = pd.DataFrame(sample_data)
        df.to_csv(self.dataset_path, index=False)
        logger.info("Sample dataset created successfully")
    
    def load_and_preprocess_dataset(self):
        """Load and preprocess the dataset"""
        try:
            # Check if dataset exists, if not download it
            if not os.path.exists(self.dataset_path):
                self.download_dataset()
            
            logger.info("Loading dataset...")
            self.df_yt = pd.read_csv(self.dataset_path)
            
            # Data preprocessing and cleaning
            logger.info("Preprocessing dataset...")
            
            # Clean titles - remove special characters except alphanumeric and spaces
            self.df_yt['clean_title'] = self.df_yt['title'].apply(
                lambda x: re.sub(r'[^a-zA-Z0-9\s]', ' ', x) if isinstance(x, str) else ' '
            )
            
            # Convert to lowercase and strip extra spaces
            self.df_yt['clean_title'] = self.df_yt['clean_title'].str.lower().str.strip()
            self.df_yt['clean_title'] = self.df_yt['clean_title'].str.replace(r'\s+', ' ', regex=True)
            
            # Handle missing values
            self.df_yt['clean_title'] = self.df_yt['clean_title'].fillna('')
            self.df_yt['genre'] = self.df_yt['genre'].fillna('General')
            
            # Ensure required columns exist with proper names
            if 'channel_name' not in self.df_yt.columns and 'channelTitle' in self.df_yt.columns:
                self.df_yt['channel_name'] = self.df_yt['channelTitle']
            if 'thumbnail_url' not in self.df_yt.columns and 'thumbnail_link' in self.df_yt.columns:
                self.df_yt['thumbnail_url'] = self.df_yt['thumbnail_link']
            if 'view_count' not in self.df_yt.columns and 'viewCount' in self.df_yt.columns:
                self.df_yt['view_count'] = self.df_yt['viewCount']
            
            # Add missing columns with default values if they don't exist
            if 'likes' not in self.df_yt.columns:
                self.df_yt['likes'] = self.df_yt.get('view_count', 0) * 0.1  # Estimate likes as 10% of views
            if 'dislikes' not in self.df_yt.columns:
                self.df_yt['dislikes'] = self.df_yt.get('likes', 0) * 0.05  # Estimate dislikes as 5% of likes
            
            # Remove empty titles
            self.df_yt = self.df_yt[self.df_yt['clean_title'].str.len() > 0]
            
            logger.info(f"Dataset loaded and preprocessed: {len(self.df_yt)} videos")
            return True
            
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            return False
    
    def get_bert_embeddings(self, text: str) -> np.ndarray:
        """
        Get BERT embeddings for a given text
        
        Args:
            text: Input text to get embeddings for
            
        Returns:
            numpy array of embeddings
        """
        try:
            # Check cache first
            if text in self.embeddings_cache:
                return self.embeddings_cache[text]
            
            # Tokenize the text
            inputs = self.tokenizer(
                text, 
                return_tensors='tf',
                padding=True, 
                truncation=True, 
                max_length=512
            )
            
            # Get embeddings from BERT model
            outputs = self.model(inputs)
            
            # Return the pooled output (CLS token representation)
            embeddings = outputs.pooler_output.numpy()
            
            # Cache the embeddings
            self.embeddings_cache[text] = embeddings
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Error getting BERT embeddings: {e}")
            return np.zeros((1, 768))  # Return zero embeddings as fallback
    
    def compute_all_embeddings(self):
        """Compute embeddings for all videos in the dataset"""
        try:
            logger.info("Computing BERT embeddings for all videos...")
            
            # Load cached embeddings if available
            if os.path.exists(self.embeddings_cache_path):
                with open(self.embeddings_cache_path, 'rb') as f:
                    self.embeddings_cache = pickle.load(f)
                logger.info("Loaded cached embeddings")
            
            # Compute embeddings for videos that don't have cached embeddings
            embeddings_list = []
            for idx, title in enumerate(self.df_yt['clean_title']):
                if idx % 50 == 0:
                    logger.info(f"Processing video {idx + 1}/{len(self.df_yt)}")
                
                embeddings = self.get_bert_embeddings(title)
                embeddings_list.append(embeddings.flatten())
            
            # Add embeddings to dataframe
            self.df_yt['embeddings'] = embeddings_list
            
            # Save embeddings cache
            with open(self.embeddings_cache_path, 'wb') as f:
                pickle.dump(self.embeddings_cache, f)
            
            logger.info("All embeddings computed and cached successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error computing embeddings: {e}")
            return False
    
    def compute_cosine_similarity(self, embedding: np.ndarray, embeddings: List[np.ndarray]) -> np.ndarray:
        """
        Compute cosine similarity between a single embedding and all other embeddings
        
        Args:
            embedding: The embedding vector for the input title
            embeddings: List of all embedding vectors in the dataset
            
        Returns:
            Array of cosine similarities
        """
        try:
            similarities = cosine_similarity(
                embedding.reshape(1, -1), 
                np.vstack(embeddings)
            ).flatten()
            return similarities
        except Exception as e:
            logger.error(f"Error computing cosine similarity: {e}")
            return np.zeros(len(embeddings))
    
    def recommend_videos(
        self, 
        title: str, 
        top_n: int = 5, 
        genre_filter: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Recommend top N similar videos based on BERT embeddings
        
        Args:
            title: The title of the video for which we want to find similar videos
            top_n: Number of similar videos to recommend
            genre_filter: Optional genre filter
            user_id: Optional user ID for personalized recommendations
            
        Returns:
            DataFrame of recommended videos
        """
        try:
            if self.df_yt is None or self.df_yt.empty:
                logger.error("Dataset not loaded")
                return pd.DataFrame()
            
            # Preprocess and get the embedding for the input title
            cleaned_title = re.sub(r'[^a-zA-Z0-9\s]', ' ', title.lower())
            cleaned_title = re.sub(r'\s+', ' ', cleaned_title).strip()
            
            embedding = self.get_bert_embeddings(cleaned_title)
            
            # Create a copy of the dataframe for processing
            df_copy = self.df_yt.copy()
            
            # Apply genre filter if specified
            if genre_filter:
                df_copy = df_copy[df_copy['genre'] == genre_filter]
            
            if df_copy.empty:
                logger.warning(f"No videos found for genre: {genre_filter}")
                return pd.DataFrame()
            
            # Compute similarities between the input embedding and all other embeddings
            similarities = self.compute_cosine_similarity(embedding, df_copy['embeddings'].tolist())
            
            # Add the similarity scores to the DataFrame
            df_copy['similarity'] = similarities
            
            # Sort the DataFrame based on similarity scores in descending order
            df_sorted = df_copy.sort_values(by='similarity', ascending=False)
            
            # Return the top N recommendations (excluding the exact input title if present)
            recommendations = df_sorted[df_sorted['title'].str.lower() != title.lower()].head(top_n)
            
            # Log the recommendation for the user
            if user_id:
                self._log_recommendation(user_id, title, recommendations)
            
            return recommendations[['title', 'channel_name', 'likes', 'dislikes', 'thumbnail_url', 'genre', 'similarity']]
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return pd.DataFrame()
    
    def _map_genre_name(self, genre: str) -> str:
        """
        Map frontend genre names to dataset genre names
        """
        genre_mapping = {
            'Coding and Programming': 'coding-programming',
            'Coding & Programming': 'coding-programming',
            'Data Science and AI/ML': 'data-science-ai',
            'Data Science & AI/ML': 'data-science-ai',
            'Design(UI/UX , graphic, product)': 'design',
            'Design': 'design',
            'Digital Marketing': 'digital-marketing',
            'Productivity & Time Management': 'soft-skills',  # Fallback to soft-skills
            'Financial Literacy & Investing': 'financial-literacy',
            'Soft Skills (Communication, Leadership)': 'soft-skills',
            'Entrepreneurship & Startups': 'entrepreneurship',
            'Writing & Content Creation': 'writing-content',
            'Public Speaking': 'soft-skills',  # Fallback to soft-skills
            'Mathematics': 'mathematics',
            'Physics': 'philosophy',  # Fallback to philosophy (closest match)
            'Chemistry': 'chemistry',
            'Biology': 'biology',
            'History': 'history-civics',
            'Geography': 'history-civics',  # Fallback to history-civics
            'Language Learning': 'language-learning',
            'Resume Building & Job Hunting': 'resume-job-hunting',
            'Interview Preparation': 'resume-job-hunting',  # Fallback to resume-job-hunting
            'Workplace Skills': 'soft-skills',
            'Tech News & Product Launches': 'ai-innovation',  # Fallback to ai-innovation
            'Cybersecurity': 'cybersecurity',
            'Cloud Computing': 'cybersecurity',  # Fallback to cybersecurity
            'Artificial Intelligence': 'ai-innovation',
            'Did You Know / Trivia': 'trivia-facts',
            'Philosophy & Critical Thinking': 'philosophy',
            'Psychology & Human Behavior': 'philosophy',  # Fallback to philosophy
            'Robotics & IoT': 'robotics-iot',
            'Electronics & Circuits': 'electronics-arduino',
            'Crafts & Artistic Skills': 'diy-projects',  # Fallback to diy-projects
            'Health & Fitness': 'health-fitness',
            'Cooking & Nutrition': 'health-fitness',  # Fallback to health-fitness
            'Personal Development & Mental Health': 'mental-wellness',
            # Additional mappings for missing categories
            'interview-prep': 'resume-job-hunting',
            'freelancing-remote': 'entrepreneurship',
            'certifications': 'resume-job-hunting',
            'tech-news': 'ai-innovation',
            'startup-ecosystem': 'startups',
            'sustainable-living': 'sustainableliving',  # Fix hyphen issue
            'science-experiments': 'science-experiments',
            'diy-projects': 'diy-projects',
            'electronics-arduino': 'electronics-arduino',
            'ai-innovation': 'ai-innovation',
            'history-civics': 'history-civics'
        }
        
        # Return mapped genre or the original if no mapping found
        return genre_mapping.get(genre, genre.lower().replace(' ', '-').replace('&', '-').replace('(', '').replace(')', '').replace(',', ''))

    def get_genre_recommendations(
        self, 
        genre: str, 
        top_n: int = 10,
        user_id: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Get top recommendations for a specific genre
        
        Args:
            genre: Genre to get recommendations for
            top_n: Number of recommendations to return
            user_id: Optional user ID for personalized recommendations
            
        Returns:
            DataFrame of recommended videos
        """
        try:
            if self.df_yt is None or self.df_yt.empty:
                logger.error("Dataset not loaded")
                return pd.DataFrame()
            
            # Map the genre name to match dataset format
            mapped_genre = self._map_genre_name(genre)
            logger.info(f"Original genre: '{genre}' mapped to: '{mapped_genre}'")
            
            # Filter by genre
            genre_videos = self.df_yt[self.df_yt['genre'] == mapped_genre]
            
            if genre_videos.empty:
                logger.warning(f"No videos found for genre: '{genre}' (mapped to: '{mapped_genre}')")
                return pd.DataFrame()
            
            # Sort by likes and get top videos
            top_videos = genre_videos.sort_values(by='likes', ascending=False).head(top_n)
            
            # Log the recommendation for the user
            if user_id:
                self._log_genre_recommendation(user_id, mapped_genre, top_videos)
            
            return top_videos[['title', 'channel_name', 'likes', 'dislikes', 'thumbnail_url', 'genre']]
            
        except Exception as e:
            logger.error(f"Error getting genre recommendations: {e}")
            return pd.DataFrame()
    
    def get_personalized_recommendations(
        self, 
        user_id: str, 
        top_n: int = 10
    ) -> pd.DataFrame:
        """
        Get personalized recommendations based on user's viewing history
        
        Args:
            user_id: User ID
            top_n: Number of recommendations to return
            
        Returns:
            DataFrame of personalized recommendations
        """
        try:
            # Get user's viewing history from MongoDB
            user_history = list(self.db.user_viewing_history.find(
                {"user_id": user_id}
            ).sort("timestamp", -1).limit(20))
            
            if not user_history:
                # If no history, return popular videos
                return self.get_popular_recommendations(top_n)
            
            # Extract watched video titles
            watched_titles = [item.get('video_title', '') for item in user_history]
            
            # Get recommendations based on watched videos
            all_recommendations = []
            
            for title in watched_titles[:5]:  # Use last 5 watched videos
                if title:
                    recs = self.recommend_videos(title, top_n=5, user_id=user_id)
                    if not recs.empty:
                        all_recommendations.append(recs)
            
            if not all_recommendations:
                return self.get_popular_recommendations(top_n)
            
            # Combine and deduplicate recommendations
            combined_recs = pd.concat(all_recommendations, ignore_index=True)
            combined_recs = combined_recs.drop_duplicates(subset=['title'])
            
            # Sort by similarity score and return top N
            final_recs = combined_recs.sort_values(by='similarity', ascending=False).head(top_n)
            
            return final_recs
            
        except Exception as e:
            logger.error(f"Error getting personalized recommendations: {e}")
            return self.get_popular_recommendations(top_n)
    
    def get_popular_recommendations(self, top_n: int = 10) -> pd.DataFrame:
        """
        Get popular videos based on likes
        
        Args:
            top_n: Number of recommendations to return
            
        Returns:
            DataFrame of popular videos
        """
        try:
            if self.df_yt is None or self.df_yt.empty:
                return pd.DataFrame()
            
            popular_videos = self.df_yt.sort_values(by='likes', ascending=False).head(top_n)
            
            return popular_videos[['title', 'channel_name', 'likes', 'dislikes', 'thumbnail_url', 'genre']]
            
        except Exception as e:
            logger.error(f"Error getting popular recommendations: {e}")
            return pd.DataFrame()
    
    def _log_recommendation(self, user_id: str, input_title: str, recommendations: pd.DataFrame):
        """Log recommendation to MongoDB"""
        try:
            log_entry = {
                "user_id": user_id,
                "input_title": input_title,
                "recommendations": recommendations.to_dict('records'),
                "timestamp": datetime.now(),
                "recommendation_type": "content_based"
            }
            self.db.recommendation_logs.insert_one(log_entry)
        except Exception as e:
            logger.error(f"Error logging recommendation: {e}")
    
    def _log_genre_recommendation(self, user_id: str, genre: str, recommendations: pd.DataFrame):
        """Log genre recommendation to MongoDB"""
        try:
            log_entry = {
                "user_id": user_id,
                "genre": genre,
                "recommendations": recommendations.to_dict('records'),
                "timestamp": datetime.now(),
                "recommendation_type": "genre_based"
            }
            self.db.recommendation_logs.insert_one(log_entry)
        except Exception as e:
            logger.error(f"Error logging genre recommendation: {e}")
    
    def initialize_system(self):
        """Initialize the complete recommendation system"""
        try:
            logger.info("Initializing BERT Recommendation System...")
            
            # Load and preprocess dataset
            if not self.load_and_preprocess_dataset():
                return False
            
            # Compute all embeddings
            if not self.compute_all_embeddings():
                return False
            
            logger.info("BERT Recommendation System initialized successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing system: {e}")
            return False
    
    def get_system_stats(self) -> Dict:
        """Get system statistics"""
        try:
            if self.df_yt is None:
                return {"error": "System not initialized"}
            
            stats = {
                "total_videos": len(self.df_yt),
                "unique_genres": self.df_yt['genre'].nunique(),
                "genres": self.df_yt['genre'].value_counts().to_dict(),
                "cached_embeddings": len(self.embeddings_cache),
                "system_status": "initialized"
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            return {"error": str(e)}


# Global instance
bert_engine = None

def get_bert_recommendation_engine():
    """Get the global BERT recommendation engine instance"""
    global bert_engine
    if bert_engine is None:
        bert_engine = BertRecommendationEngine()
    return bert_engine 
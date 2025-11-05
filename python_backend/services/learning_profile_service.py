"""
Learning Profile Service - Personalized Learning Path (Feature 6)
Tracks user learning progress, proficiency levels, and generates adaptive recommendations
"""

import boto3
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from decimal import Decimal
import json
import math

logger = logging.getLogger(__name__)


class LearningProfileService:
    """
    Manages user learning profiles with personalized tracking
    """
    
    def __init__(self, table_name: str = "StreamSmart-LearningProfiles", region: str = "ap-south-2"):
        """
        Initialize DynamoDB client for learning profiles
        """
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table_name = table_name
        self.table = None
        self._ensure_table_exists()
        logger.info(f"✅ LearningProfileService initialized with table: {table_name}")
    
    def _ensure_table_exists(self):
        """
        Create table if it doesn't exist
        """
        try:
            existing_tables = [t.name for t in self.dynamodb.tables.all()]
            
            if self.table_name not in existing_tables:
                logger.info(f"Creating table {self.table_name}...")
                
                table = self.dynamodb.create_table(
                    TableName=self.table_name,
                    KeySchema=[
                        {'AttributeName': 'PK', 'KeyType': 'HASH'},
                        {'AttributeName': 'SK', 'KeyType': 'RANGE'}
                    ],
                    AttributeDefinitions=[
                        {'AttributeName': 'PK', 'AttributeType': 'S'},
                        {'AttributeName': 'SK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                        {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
                    ],
                    GlobalSecondaryIndexes=[
                        {
                            'IndexName': 'GSI1',
                            'KeySchema': [
                                {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                                {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                            ],
                            'Projection': {'ProjectionType': 'ALL'}
                        }
                    ],
                    BillingMode='PAY_PER_REQUEST'
                )
                
                table.wait_until_exists()
                logger.info(f"✅ Table {self.table_name} created successfully")
            
            self.table = self.dynamodb.Table(self.table_name)
            
        except Exception as e:
            logger.error(f"Error ensuring table exists: {e}")
            self.table = self.dynamodb.Table(self.table_name)
    
    def _decimal_to_float(self, obj: Any) -> Any:
        """
        Convert DynamoDB Decimal to float recursively
        """
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._decimal_to_float(v) for v in obj]
        return obj
    
    def _float_to_decimal(self, obj: Any) -> Any:
        """
        Convert float to Decimal for DynamoDB
        """
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._float_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._float_to_decimal(v) for v in obj]
        return obj
    
    async def get_or_create_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get existing profile or create new one with defaults
        """
        try:
            # Try to get existing profile
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': 'PROFILE'
                }
            )
            
            if 'Item' in response:
                profile = self._decimal_to_float(response['Item'])
                logger.info(f"Retrieved profile for user {user_id}")
                return profile
            
            # Create new profile with defaults
            now = datetime.now().isoformat()
            default_profile = {
                'PK': f'USER#{user_id}',
                'SK': 'PROFILE',
                'userId': user_id,
                
                # Demographics
                'educationLevel': 'intermediate',  # beginner/intermediate/advanced/expert
                'learningStyle': 'visual',  # visual/auditory/reading/kinesthetic
                'nativeLanguage': 'en',
                'timezone': 'UTC',
                
                # Behavior patterns
                'avgSessionDuration': 0,
                'preferredStudyTime': [],
                'questionsPerSession': 0,
                'completionRate': 0,
                
                # Knowledge state
                'masteredTopics': [],
                'weakAreas': [],
                'currentLevel': {},  # topic -> proficiency (0-100)
                'lastPracticed': {},  # topic -> timestamp
                'learningVelocity': 0,  # concepts/hour
                
                # Preferences
                'explanationDepth': 'detailed',  # concise/detailed/comprehensive
                'useAnalogies': True,
                'preferredExampleTypes': ['practical', 'visual'],
                'showMath': True,
                
                # Progress tracking
                'totalQuestionsAsked': 0,
                'topicsExplored': [],
                'videosWatched': [],
                'quizzesTaken': 0,
                'avgQuizScore': 0,
                'questionsPerTopic': {},
                
                # Temporal data
                'lastActive': now,
                'streak': 0,  # consecutive days
                'createdAt': now,
                'updatedAt': now,
                
                # GSI for queries
                'GSI1PK': f'EDUCATION#{default_profile["educationLevel"]}',
                'GSI1SK': f'USER#{user_id}'
            }
            
            # Convert floats to Decimal for DynamoDB
            default_profile = self._float_to_decimal(default_profile)
            
            self.table.put_item(Item=default_profile)
            logger.info(f"✅ Created new profile for user {user_id}")
            
            return self._decimal_to_float(default_profile)
            
        except Exception as e:
            logger.error(f"Error getting/creating profile: {e}", exc_info=True)
            raise
    
    async def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update specific fields in user profile
        """
        try:
            # Build update expression
            update_expr_parts = []
            expr_attr_names = {}
            expr_attr_values = {}
            
            updates['updatedAt'] = datetime.now().isoformat()
            updates = self._float_to_decimal(updates)
            
            for key, value in updates.items():
                safe_key = key.replace('.', '_')
                update_expr_parts.append(f'#{safe_key} = :{safe_key}')
                expr_attr_names[f'#{safe_key}'] = key
                expr_attr_values[f':{safe_key}'] = value
            
            update_expr = 'SET ' + ', '.join(update_expr_parts)
            
            response = self.table.update_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': 'PROFILE'
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            
            updated_profile = self._decimal_to_float(response['Attributes'])
            logger.info(f"✅ Updated profile for user {user_id}")
            return updated_profile
            
        except Exception as e:
            logger.error(f"Error updating profile: {e}", exc_info=True)
            raise
    
    def calculate_proficiency(
        self,
        current_proficiency: float,
        question_quality: float,
        comprehension_score: float,
        learning_rate: float = 0.1
    ) -> float:
        """
        Calculate new proficiency level using adaptive algorithm
        
        Args:
            current_proficiency: Current skill level (0-100)
            question_quality: Quality of question asked (0-1)
            comprehension_score: How well answer was understood (0-1)
            learning_rate: How fast user learns (default 0.1)
        
        Returns:
            New proficiency score (0-100)
        """
        # Sigmoid function for diminishing returns at high levels
        def sigmoid_growth(x, rate):
            return 100 / (1 + math.exp(-rate * (x - 50)))
        
        # Calculate learning delta
        engagement = (question_quality + comprehension_score) / 2
        max_gain = 100 - current_proficiency
        gain = max_gain * engagement * learning_rate
        
        new_proficiency = min(100, current_proficiency + gain)
        
        return round(new_proficiency, 2)
    
    def apply_forgetting_curve(
        self,
        proficiency: float,
        last_practiced: str,
        decay_rate: float = 0.05
    ) -> float:
        """
        Apply forgetting curve to adjust proficiency over time
        Ebbinghaus forgetting curve: R = e^(-t/S)
        
        Args:
            proficiency: Current proficiency (0-100)
            last_practiced: ISO timestamp of last practice
            decay_rate: How fast knowledge decays (default 0.05)
        
        Returns:
            Adjusted proficiency score
        """
        try:
            last_time = datetime.fromisoformat(last_practiced)
            days_elapsed = (datetime.now() - last_time).days
            
            if days_elapsed == 0:
                return proficiency
            
            # Retention formula
            retention = math.exp(-decay_rate * days_elapsed)
            adjusted = proficiency * retention
            
            return round(max(0, adjusted), 2)
            
        except Exception as e:
            logger.warning(f"Error applying forgetting curve: {e}")
            return proficiency
    
    async def update_topic_proficiency(
        self,
        user_id: str,
        topic: str,
        question_quality: float,
        comprehension_score: float
    ) -> Dict[str, Any]:
        """
        Update proficiency for a specific topic after interaction
        """
        try:
            # Get current profile
            profile = await self.get_or_create_profile(user_id)
            
            # Get current proficiency
            current_level = profile.get('currentLevel', {})
            current_proficiency = current_level.get(topic, 0)
            
            # Apply forgetting curve if last practiced exists
            last_practiced = profile.get('lastPracticed', {})
            if topic in last_practiced:
                current_proficiency = self.apply_forgetting_curve(
                    current_proficiency,
                    last_practiced[topic]
                )
            
            # Calculate new proficiency
            learning_velocity = profile.get('learningVelocity', 0.1)
            new_proficiency = self.calculate_proficiency(
                current_proficiency,
                question_quality,
                comprehension_score,
                learning_velocity
            )
            
            # Update profile
            current_level[topic] = new_proficiency
            last_practiced[topic] = datetime.now().isoformat()
            
            # Update question count per topic
            questions_per_topic = profile.get('questionsPerTopic', {})
            questions_per_topic[topic] = questions_per_topic.get(topic, 0) + 1
            
            # Update topics explored
            topics_explored = profile.get('topicsExplored', [])
            if topic not in topics_explored:
                topics_explored.append(topic)
            
            updates = {
                'currentLevel': current_level,
                'lastPracticed': last_practiced,
                'questionsPerTopic': questions_per_topic,
                'topicsExplored': topics_explored,
                'totalQuestionsAsked': profile.get('totalQuestionsAsked', 0) + 1,
                'lastActive': datetime.now().isoformat()
            }
            
            # Update mastered topics and weak areas
            if new_proficiency >= 80 and topic not in profile.get('masteredTopics', []):
                mastered = profile.get('masteredTopics', [])
                mastered.append(topic)
                updates['masteredTopics'] = mastered
            elif new_proficiency < 50 and questions_per_topic[topic] > 3:
                weak = profile.get('weakAreas', [])
                if topic not in weak:
                    weak.append(topic)
                    updates['weakAreas'] = weak
            
            updated_profile = await self.update_profile(user_id, updates)
            
            logger.info(f"Updated {topic} proficiency: {current_proficiency} -> {new_proficiency}")
            
            return {
                'topic': topic,
                'previous_proficiency': current_proficiency,
                'new_proficiency': new_proficiency,
                'is_mastered': new_proficiency >= 80,
                'needs_review': new_proficiency < 50 and questions_per_topic[topic] > 3
            }
            
        except Exception as e:
            logger.error(f"Error updating topic proficiency: {e}", exc_info=True)
            raise
    
    async def get_weak_areas(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Identify topics that need more attention
        """
        try:
            profile = await self.get_or_create_profile(user_id)
            
            current_level = profile.get('currentLevel', {})
            questions_per_topic = profile.get('questionsPerTopic', {})
            last_practiced = profile.get('lastPracticed', {})
            
            weak_areas = []
            
            for topic, proficiency in current_level.items():
                # Apply forgetting curve
                if topic in last_practiced:
                    adjusted_proficiency = self.apply_forgetting_curve(
                        proficiency,
                        last_practiced[topic]
                    )
                else:
                    adjusted_proficiency = proficiency
                
                # Detect weakness signals
                signals = {
                    'low_proficiency': adjusted_proficiency < 50,
                    'many_questions': questions_per_topic.get(topic, 0) > 5,
                    'time_decay': self._days_since_practice(topic, last_practiced) > 7,
                    'declining': adjusted_proficiency < proficiency
                }
                
                weakness_score = sum(signals.values()) / len(signals)
                
                if weakness_score > 0.5:  # At least 50% of signals indicate weakness
                    weak_areas.append({
                        'topic': topic,
                        'proficiency': adjusted_proficiency,
                        'weakness_score': weakness_score,
                        'signals': signals,
                        'questions_asked': questions_per_topic.get(topic, 0),
                        'days_since_practice': self._days_since_practice(topic, last_practiced),
                        'severity': 'critical' if weakness_score > 0.75 else 'important' if weakness_score > 0.6 else 'minor'
                    })
            
            # Sort by urgency
            weak_areas.sort(key=lambda x: x['weakness_score'], reverse=True)
            
            return weak_areas
            
        except Exception as e:
            logger.error(f"Error detecting weak areas: {e}", exc_info=True)
            return []
    
    def _days_since_practice(self, topic: str, last_practiced: Dict[str, str]) -> int:
        """
        Calculate days since topic was last practiced
        """
        try:
            if topic not in last_practiced:
                return 999  # Very high number
            
            last_time = datetime.fromisoformat(last_practiced[topic])
            days = (datetime.now() - last_time).days
            return days
        except:
            return 999
    
    async def get_progress_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive progress summary
        """
        try:
            profile = await self.get_or_create_profile(user_id)
            
            current_level = profile.get('currentLevel', {})
            
            # Calculate overall progress
            if current_level:
                overall_progress = sum(current_level.values()) / len(current_level)
            else:
                overall_progress = 0
            
            # Get weak areas
            weak_areas = await self.get_weak_areas(user_id)
            
            # Calculate streak
            last_active = datetime.fromisoformat(profile.get('lastActive', datetime.now().isoformat()))
            days_inactive = (datetime.now() - last_active).days
            current_streak = profile.get('streak', 0) if days_inactive < 2 else 0
            
            return {
                'overall_progress': round(overall_progress, 2),
                'mastered_topics': profile.get('masteredTopics', []),
                'weak_areas': weak_areas[:5],  # Top 5
                'topics_explored': len(profile.get('topicsExplored', [])),
                'total_questions': profile.get('totalQuestionsAsked', 0),
                'videos_watched': len(profile.get('videosWatched', [])),
                'current_streak': current_streak,
                'education_level': profile.get('educationLevel', 'intermediate'),
                'learning_velocity': profile.get('learningVelocity', 0),
                'topic_proficiencies': dict(sorted(
                    current_level.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10])  # Top 10 topics
            }
            
        except Exception as e:
            logger.error(f"Error generating progress summary: {e}", exc_info=True)
            raise


# Singleton instance
learning_profile_service = LearningProfileService()

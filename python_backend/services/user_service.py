#!/usr/bin/env python3
"""
User Service for Multi-User Web Application
Handles authentication, sessions, and user data management
"""

import os
import jwt
import bcrypt
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

# Pydantic Models
class UserRegistration(BaseModel):
    email: EmailStr
    username: str
    password: str
    firstName: str
    lastName: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    userId: str
    email: str
    username: str
    firstName: str
    lastName: str
    subscription: Dict[str, Any]
    preferences: Dict[str, Any]
    demographics: Optional[Dict[str, Any]] = None
    learningPreferences: Optional[Dict[str, Any]] = None
    behaviorPatterns: Optional[Dict[str, Any]] = None
    createdAt: datetime
    lastLogin: datetime

class UserSession(BaseModel):
    sessionId: str
    userId: str
    type: str
    createdAt: datetime
    expiresAt: datetime

class UsageStats(BaseModel):
    videosProcessed: int
    transcriptsGenerated: int
    summariesCreated: int
    ragQueries: int
    storageUsed: float

class UserService:
    def __init__(self, mongodb_uri: str, db_name: str = "streamsmart"):
        """Initialize User Service with MongoDB connection"""
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.users_collection = self.db.users
        self.sessions_collection = self.db.user_sessions
        self.usage_collection = self.db.usage_analytics
        
        # JWT settings
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
        self.jwt_algorithm = 'HS256'
        self.token_expire_hours = 24
        
        # Security
        self.security = HTTPBearer()
        
        # Ensure indexes
        self._create_indexes()
    
    def _create_indexes(self):
        """Create necessary database indexes"""
        try:
            # Users collection indexes
            self.users_collection.create_index("userId", unique=True)
            self.users_collection.create_index("email", unique=True)
            self.users_collection.create_index("username", unique=True)
            
            # Sessions collection indexes
            self.sessions_collection.create_index("sessionId", unique=True)
            self.sessions_collection.create_index("userId")
            self.sessions_collection.create_index("expiresAt", expireAfterSeconds=0)
            
            # Usage analytics indexes
            self.usage_collection.create_index([("userId", 1), ("date", 1)])
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def _generate_user_id(self) -> str:
        """Generate a unique user ID"""
        return f"usr_{uuid.uuid4().hex[:12]}"
    
    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"sess_{uuid.uuid4().hex}"
    
    def _create_jwt_token(self, user_id: str, session_id: str) -> str:
        """Create a JWT token for user session"""
        payload = {
            'user_id': user_id,
            'session_id': session_id,
            'exp': datetime.utcnow() + timedelta(hours=self.token_expire_hours),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _decode_jwt_token(self, token: str) -> Dict[str, Any]:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def register_user(self, registration: UserRegistration) -> Dict[str, Any]:
        """Register a new user"""
        try:
            # Check if user already exists
            existing_user = self.users_collection.find_one({
                "$or": [
                    {"email": registration.email},
                    {"username": registration.username}
                ]
            })
            
            if existing_user:
                if existing_user["email"] == registration.email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already taken"
                    )
            
            # Create new user
            user_id = self._generate_user_id()
            hashed_password = self._hash_password(registration.password)
            
            user_doc = {
                "userId": user_id,
                "email": registration.email,
                "username": registration.username,
                "passwordHash": hashed_password,
                "profile": {
                    "firstName": registration.firstName,
                    "lastName": registration.lastName,
                    "preferences": {
                        "language": "en",
                        "theme": "light",
                        "defaultSummaryLength": "detailed",
                        "preferred_genres": [],
                        "difficulty_preference": "adaptive",
                        "content_length": "medium",
                        "learning_style": "visual"
                    },
                    "demographics": {
                        "age_group": None,
                        "learning_goals": [],
                        "time_availability": None
                    },
                    "behaviorPatterns": {
                        "peak_learning_hours": None,
                        "session_frequency": None,
                        "completion_rate": 0,
                        "genre_switching_pattern": "focused"
                    }
                },
                "subscription": {
                    "plan": "free",
                    "limits": {
                        "monthlyVideos": 10,
                        "storageGB": 1.0,
                        "ragQueries": 50
                    },
                    "usage": {
                        "videosProcessed": 0,
                        "storageUsed": 0.0,
                        "ragQueriesUsed": 0,
                        "resetDate": datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)
                    }
                },
                "createdAt": datetime.utcnow(),
                "lastLogin": None,
                "isActive": True
            }
            
            result = self.users_collection.insert_one(user_doc)
            
            if result.inserted_id:
                logger.info(f"User registered successfully: {user_id}")
                return {
                    "userId": user_id,
                    "message": "User registered successfully",
                    "email": registration.email,
                    "username": registration.username
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to register user"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error registering user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during registration"
            )
    
    async def login_user(self, login: UserLogin, ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """Authenticate user and create session"""
        try:
            # Find user by email
            user = self.users_collection.find_one({"email": login.email})
            
            if not user or not self._verify_password(login.password, user["passwordHash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            if not user.get("isActive", True):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Account is deactivated"
                )
            
            # Create session
            session_id = self._generate_session_id()
            session_doc = {
                "sessionId": session_id,
                "userId": user["userId"],
                "type": "authenticated",
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "createdAt": datetime.utcnow(),
                "expiresAt": datetime.utcnow() + timedelta(hours=self.token_expire_hours),
                "lastActivity": datetime.utcnow(),
                "isActive": True
            }
            
            self.sessions_collection.insert_one(session_doc)
            
            # Generate JWT token
            token = self._create_jwt_token(user["userId"], session_id)
            
            # Update last login
            self.users_collection.update_one(
                {"userId": user["userId"]},
                {"$set": {"lastLogin": datetime.utcnow()}}
            )
            
            logger.info(f"User logged in successfully: {user['userId']}")
            
            return {
                "token": token,
                "user": {
                    "userId": user["userId"],
                    "email": user["email"],
                    "username": user["username"],
                    "firstName": user["profile"]["firstName"],
                    "lastName": user["profile"]["lastName"],
                    "subscription": user["subscription"],
                    "preferences": user["profile"]["preferences"]
                },
                "session": {
                    "sessionId": session_id,
                    "expiresAt": session_doc["expiresAt"].isoformat()
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during login: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during login"
            )
    
    async def create_guest_session(self, ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """Create a guest session for unauthenticated users"""
        try:
            session_id = self._generate_session_id()
            guest_user_id = f"guest_{uuid.uuid4().hex[:8]}"
            
            session_doc = {
                "sessionId": session_id,
                "userId": guest_user_id,
                "type": "guest",
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "createdAt": datetime.utcnow(),
                "expiresAt": datetime.utcnow() + timedelta(hours=2),  # Shorter expiry for guests
                "lastActivity": datetime.utcnow(),
                "isActive": True
            }
            
            self.sessions_collection.insert_one(session_doc)
            
            # Generate limited token for guest
            token = self._create_jwt_token(guest_user_id, session_id)
            
            return {
                "token": token,
                "user": {
                    "userId": guest_user_id,
                    "type": "guest",
                    "limitations": {
                        "maxVideos": 3,
                        "maxQueries": 10,
                        "sessionDuration": "2 hours"
                    }
                },
                "session": {
                    "sessionId": session_id,
                    "expiresAt": session_doc["expiresAt"].isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error creating guest session: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create guest session"
            )
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> Dict[str, Any]:
        """Get current user from JWT token"""
        try:
            # Decode token
            payload = self._decode_jwt_token(credentials.credentials)
            user_id = payload.get('user_id')
            session_id = payload.get('session_id')
            
            # Verify session is still active
            session = self.sessions_collection.find_one({
                "sessionId": session_id,
                "userId": user_id,
                "isActive": True,
                "expiresAt": {"$gt": datetime.utcnow()}
            })
            
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid"
                )
            
            # Update last activity
            self.sessions_collection.update_one(
                {"sessionId": session_id},
                {"$set": {"lastActivity": datetime.utcnow()}}
            )
            
            # Get user info (if not guest)
            if session["type"] == "guest":
                return {
                    "userId": user_id,
                    "type": "guest",
                    "sessionId": session_id,
                    "limitations": {
                        "maxVideos": 3,
                        "maxQueries": 10
                    }
                }
            else:
                user = self.users_collection.find_one({"userId": user_id})
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found"
                    )
                
                return {
                    "userId": user_id,
                    "type": "authenticated",
                    "sessionId": session_id,
                    "email": user["email"],
                    "username": user["username"],
                    "profile": user["profile"],
                    "subscription": user["subscription"]
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication"
            )
    
    async def logout_user(self, session_id: str) -> Dict[str, Any]:
        """Logout user and invalidate session"""
        try:
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {"$set": {"isActive": False, "loggedOutAt": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                return {"message": "Logged out successfully"}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during logout: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error during logout"
            )
    
    async def get_user_usage_stats(self, user_id: str) -> UsageStats:
        """Get user's current usage statistics"""
        try:
            if user_id.startswith("guest_"):
                # Return limited stats for guest users
                return UsageStats(
                    videosProcessed=0,
                    transcriptsGenerated=0,
                    summariesCreated=0,
                    ragQueries=0,
                    storageUsed=0.0
                )
            
            user = self.users_collection.find_one({"userId": user_id})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            usage = user.get("subscription", {}).get("usage", {})
            
            return UsageStats(
                videosProcessed=usage.get("videosProcessed", 0),
                transcriptsGenerated=usage.get("videosProcessed", 0),  # Same as videos processed
                summariesCreated=usage.get("videosProcessed", 0),     # Same as videos processed
                ragQueries=usage.get("ragQueriesUsed", 0),
                storageUsed=usage.get("storageUsed", 0.0)
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting usage stats: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error retrieving usage statistics"
            )
    
    async def update_usage(self, user_id: str, metric: str, increment: int = 1) -> bool:
        """Update user usage metrics"""
        try:
            if user_id.startswith("guest_"):
                # Don't track usage for guest users
                return True
            
            update_field = f"subscription.usage.{metric}"
            
            result = self.users_collection.update_one(
                {"userId": user_id},
                {"$inc": {update_field: increment}}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating usage for {user_id}: {e}")
            return False
    
    async def check_usage_limits(self, user_id: str, action: str) -> bool:
        """Check if user can perform an action based on their usage limits"""
        try:
            if user_id.startswith("guest_"):
                # Implement guest limitations
                session = self.sessions_collection.find_one({"userId": user_id})
                if not session:
                    return False
                
                # Simple guest limits - could be enhanced
                return True  # For now, allow guest actions
            
            user = self.users_collection.find_one({"userId": user_id})
            if not user:
                return False
            
            limits = user.get("subscription", {}).get("limits", {})
            usage = user.get("subscription", {}).get("usage", {})
            
            # Check specific action limits
            if action == "process_video":
                return usage.get("videosProcessed", 0) < limits.get("monthlyVideos", 10)
            elif action == "rag_query":
                return usage.get("ragQueriesUsed", 0) < limits.get("ragQueries", 50)
            elif action == "storage":
                return usage.get("storageUsed", 0.0) < limits.get("storageGB", 1.0)
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking usage limits: {e}")
            return False

# Global user service instance
user_service = None

def get_user_service() -> UserService:
    """Get user service instance"""
    global user_service
    if user_service is None:
        mongodb_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        user_service = UserService(mongodb_uri)
    return user_service

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Dependency to get current user"""
    service = get_user_service()
    return service.get_current_user(credentials) 
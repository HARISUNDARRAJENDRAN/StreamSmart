#!/usr/bin/env python3
"""
Admin Service for Multi-User Web Application
Provides administrative access to all user data and system management
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from bson import ObjectId
import jwt
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Admin-specific models
class AdminUser(BaseModel):
    adminId: str
    email: str
    role: str  # "super_admin", "content_moderator", "analytics_viewer"
    permissions: List[str]
    createdAt: datetime
    lastLogin: datetime

class SystemStats(BaseModel):
    totalUsers: int
    activeUsers: int
    guestSessions: int
    totalTranscripts: int
    totalChatSessions: int
    totalQueries: int
    storageUsed: float
    lastUpdated: datetime

class UserOverview(BaseModel):
    userId: str
    email: str
    username: str
    type: str
    plan: str
    transcriptCount: int
    chatSessionCount: int
    lastActivity: datetime
    totalQueries: int
    storageUsed: float
    isActive: bool

class AdminService:
    def __init__(self, mongodb_uri: str, db_name: str = "streamsmart"):
        """Initialize Admin Service with full database access"""
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        
        # Collections
        self.users_collection = self.db.users
        self.sessions_collection = self.db.user_sessions
        self.transcripts_collection = self.db.transcripts
        self.chat_sessions_collection = self.db.chat_sessions
        self.summaries_collection = self.db.video_summaries
        self.embeddings_collection = self.db.vector_embeddings
        self.usage_collection = self.db.usage_analytics
        self.admin_collection = self.db.admin_users
        
        # Admin authentication
        self.jwt_secret = os.getenv('ADMIN_JWT_SECRET', 'admin-secret-key-change-in-production')
        self.jwt_algorithm = 'HS256'
        
        # Create admin indexes
        self._create_admin_indexes()
    
    def _create_admin_indexes(self):
        """Create admin-specific database indexes"""
        try:
            # Admin users collection
            self.admin_collection.create_index("adminId", unique=True)
            self.admin_collection.create_index("email", unique=True)
            
            # Admin analytics indexes
            self.transcripts_collection.create_index("createdAt")
            self.chat_sessions_collection.create_index("createdAt")
            self.users_collection.create_index("createdAt")
            self.sessions_collection.create_index("createdAt")
            
            logger.info("Admin indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating admin indexes: {e}")
    
    async def get_system_stats(self) -> SystemStats:
        """Get comprehensive system statistics"""
        try:
            # Count active users (logged in within last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            total_users = self.users_collection.count_documents({})
            active_users = self.users_collection.count_documents({
                "lastLogin": {"$gte": thirty_days_ago}
            })
            
            # Count guest sessions (active in last 24 hours)
            yesterday = datetime.utcnow() - timedelta(days=1)
            guest_sessions = self.sessions_collection.count_documents({
                "type": "guest",
                "createdAt": {"$gte": yesterday}
            })
            
            total_transcripts = self.transcripts_collection.count_documents({})
            total_chat_sessions = self.chat_sessions_collection.count_documents({})
            
            # Calculate total queries from chat sessions
            pipeline = [
                {"$group": {"_id": None, "totalQueries": {"$sum": "$totalMessages"}}}
            ]
            query_result = list(self.chat_sessions_collection.aggregate(pipeline))
            total_queries = query_result[0]["totalQueries"] if query_result else 0
            
            # Calculate total storage used
            storage_pipeline = [
                {"$group": {"_id": None, "totalStorage": {"$sum": "$subscription.usage.storageUsed"}}}
            ]
            storage_result = list(self.users_collection.aggregate(storage_pipeline))
            storage_used = storage_result[0]["totalStorage"] if storage_result else 0.0
            
            return SystemStats(
                totalUsers=total_users,
                activeUsers=active_users,
                guestSessions=guest_sessions,
                totalTranscripts=total_transcripts,
                totalChatSessions=total_chat_sessions,
                totalQueries=total_queries // 2 if total_queries > 0 else 0,  # Divide by 2 (user + assistant messages)
                storageUsed=storage_used,
                lastUpdated=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            raise Exception(f"Failed to get system statistics: {str(e)}")
    
    async def get_all_users(self, page: int = 1, limit: int = 50, search: str = None) -> Dict[str, Any]:
        """Get all users with pagination and search"""
        try:
            skip = (page - 1) * limit
            
            # Build query
            query = {}
            if search:
                query = {
                    "$or": [
                        {"email": {"$regex": search, "$options": "i"}},
                        {"username": {"$regex": search, "$options": "i"}},
                        {"profile.firstName": {"$regex": search, "$options": "i"}},
                        {"profile.lastName": {"$regex": search, "$options": "i"}}
                    ]
                }
            
            # Get users with counts
            users_cursor = self.users_collection.find(
                query,
                {"passwordHash": 0}  # Exclude password hash
            ).sort("createdAt", -1).skip(skip).limit(limit)
            
            users = []
            for user in users_cursor:
                # Get additional stats for each user
                transcript_count = self.transcripts_collection.count_documents({"userId": user["userId"]})
                chat_count = self.chat_sessions_collection.count_documents({"userId": user["userId"]})
                
                # Get last activity (most recent session)
                last_session = self.sessions_collection.find_one(
                    {"userId": user["userId"]},
                    sort=[("lastActivity", -1)]
                )
                last_activity = last_session["lastActivity"] if last_session else user.get("createdAt")
                
                # Get total queries from chat sessions
                chat_sessions = list(self.chat_sessions_collection.find({"userId": user["userId"]}))
                total_queries = sum(session.get("totalMessages", 0) for session in chat_sessions) // 2
                
                user_overview = UserOverview(
                    userId=user["userId"],
                    email=user["email"],
                    username=user["username"],
                    type="authenticated",
                    plan=user.get("subscription", {}).get("plan", "free"),
                    transcriptCount=transcript_count,
                    chatSessionCount=chat_count,
                    lastActivity=last_activity,
                    totalQueries=total_queries,
                    storageUsed=user.get("subscription", {}).get("usage", {}).get("storageUsed", 0.0),
                    isActive=user.get("isActive", True)
                )
                
                users.append(user_overview.dict())
            
            # Get total count for pagination
            total_count = self.users_collection.count_documents(query)
            
            return {
                "users": users,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            raise Exception(f"Failed to get users: {str(e)}")
    
    async def get_user_details(self, user_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific user"""
        try:
            # Get user data
            user = self.users_collection.find_one(
                {"userId": user_id},
                {"passwordHash": 0}
            )
            
            if not user:
                raise Exception("User not found")
            
            # Get user's transcripts
            transcripts = list(self.transcripts_collection.find(
                {"userId": user_id},
                {"transcript.fullText": 0}  # Exclude full text for overview
            ).sort("createdAt", -1).limit(10))
            
            # Get user's chat sessions
            chat_sessions = list(self.chat_sessions_collection.find(
                {"userId": user_id},
                {"messages": 0}  # Exclude messages for overview
            ).sort("lastActivity", -1).limit(10))
            
            # Get user's recent sessions
            sessions = list(self.sessions_collection.find(
                {"userId": user_id}
            ).sort("createdAt", -1).limit(10))
            
            # Calculate user analytics
            total_messages = sum(session.get("totalMessages", 0) for session in chat_sessions)
            total_transcripts = len(transcripts)
            total_storage = user.get("subscription", {}).get("usage", {}).get("storageUsed", 0.0)
            
            # Convert ObjectIds to strings
            for transcript in transcripts:
                transcript["_id"] = str(transcript["_id"])
                transcript["createdAt"] = transcript["createdAt"].isoformat()
            
            for session in chat_sessions:
                session["_id"] = str(session["_id"])
                session["createdAt"] = session["createdAt"].isoformat()
                session["lastActivity"] = session["lastActivity"].isoformat()
            
            for session in sessions:
                session["_id"] = str(session["_id"])
                session["createdAt"] = session["createdAt"].isoformat()
                session["lastActivity"] = session["lastActivity"].isoformat()
            
            user["_id"] = str(user["_id"])
            user["createdAt"] = user["createdAt"].isoformat()
            if user.get("lastLogin"):
                user["lastLogin"] = user["lastLogin"].isoformat()
            
            return {
                "user": user,
                "transcripts": transcripts,
                "chatSessions": chat_sessions,
                "recentSessions": sessions,
                "analytics": {
                    "totalTranscripts": total_transcripts,
                    "totalChatSessions": len(chat_sessions),
                    "totalMessages": total_messages,
                    "storageUsed": total_storage
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting user details for {user_id}: {e}")
            raise Exception(f"Failed to get user details: {str(e)}")
    
    async def get_all_transcripts(self, page: int = 1, limit: int = 50, user_id: str = None) -> Dict[str, Any]:
        """Get all transcripts across all users (or for specific user)"""
        try:
            skip = (page - 1) * limit
            
            # Build query
            query = {}
            if user_id:
                query["userId"] = user_id
            
            # Get transcripts
            transcripts_cursor = self.transcripts_collection.find(
                query,
                {"transcript.fullText": 0}  # Exclude full text for list view
            ).sort("createdAt", -1).skip(skip).limit(limit)
            
            transcripts = []
            for transcript in transcripts_cursor:
                # Get user info
                user = self.users_collection.find_one(
                    {"userId": transcript["userId"]},
                    {"email": 1, "username": 1}
                )
                
                transcript_data = {
                    **transcript,
                    "_id": str(transcript["_id"]),
                    "createdAt": transcript["createdAt"].isoformat(),
                    "updatedAt": transcript["updatedAt"].isoformat(),
                    "userEmail": user["email"] if user else "Unknown",
                    "username": user["username"] if user else "Unknown"
                }
                
                transcripts.append(transcript_data)
            
            # Get total count
            total_count = self.transcripts_collection.count_documents(query)
            
            return {
                "transcripts": transcripts,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting all transcripts: {e}")
            raise Exception(f"Failed to get transcripts: {str(e)}")
    
    async def get_transcript_content(self, transcript_id: str) -> Dict[str, Any]:
        """Get full transcript content (admin can access any transcript)"""
        try:
            transcript = self.transcripts_collection.find_one({"transcriptId": transcript_id})
            
            if not transcript:
                raise Exception("Transcript not found")
            
            # Get user info
            user = self.users_collection.find_one(
                {"userId": transcript["userId"]},
                {"email": 1, "username": 1, "profile.firstName": 1, "profile.lastName": 1}
            )
            
            # Get associated chat sessions
            chat_sessions = list(self.chat_sessions_collection.find(
                {"transcriptIds": transcript_id},
                {"messages": 0}
            ))
            
            transcript["_id"] = str(transcript["_id"])
            transcript["createdAt"] = transcript["createdAt"].isoformat()
            transcript["updatedAt"] = transcript["updatedAt"].isoformat()
            
            for session in chat_sessions:
                session["_id"] = str(session["_id"])
                session["createdAt"] = session["createdAt"].isoformat()
                session["lastActivity"] = session["lastActivity"].isoformat()
            
            return {
                "transcript": transcript,
                "user": user,
                "associatedChatSessions": chat_sessions
            }
            
        except Exception as e:
            logger.error(f"Error getting transcript content {transcript_id}: {e}")
            raise Exception(f"Failed to get transcript: {str(e)}")
    
    async def moderate_content(self, content_id: str, content_type: str, action: str, reason: str = None) -> Dict[str, Any]:
        """Moderate user content (transcripts, chat sessions)"""
        try:
            timestamp = datetime.utcnow()
            
            if content_type == "transcript":
                collection = self.transcripts_collection
                id_field = "transcriptId"
            elif content_type == "chat_session":
                collection = self.chat_sessions_collection
                id_field = "chatSessionId"
            else:
                raise Exception("Invalid content type")
            
            if action == "hide":
                update = {
                    "$set": {
                        "moderation": {
                            "isHidden": True,
                            "hiddenAt": timestamp,
                            "reason": reason,
                            "moderatedBy": "admin"
                        }
                    }
                }
            elif action == "unhide":
                update = {
                    "$unset": {"moderation": ""},
                    "$set": {"moderatedAt": timestamp}
                }
            elif action == "delete":
                # Soft delete
                update = {
                    "$set": {
                        "isDeleted": True,
                        "deletedAt": timestamp,
                        "deletionReason": reason,
                        "deletedBy": "admin"
                    }
                }
            else:
                raise Exception("Invalid moderation action")
            
            result = collection.update_one({id_field: content_id}, update)
            
            if result.modified_count > 0:
                return {
                    "success": True,
                    "message": f"Content {action}d successfully",
                    "contentId": content_id,
                    "action": action,
                    "timestamp": timestamp.isoformat()
                }
            else:
                raise Exception("Content not found or no changes made")
                
        except Exception as e:
            logger.error(f"Error moderating content {content_id}: {e}")
            raise Exception(f"Failed to moderate content: {str(e)}")
    
    async def get_usage_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get usage analytics for specified time period"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Daily user registrations
            registration_pipeline = [
                {"$match": {"createdAt": {"$gte": start_date}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            registrations = list(self.users_collection.aggregate(registration_pipeline))
            
            # Daily transcript uploads
            transcript_pipeline = [
                {"$match": {"createdAt": {"$gte": start_date}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            transcripts = list(self.transcripts_collection.aggregate(transcript_pipeline))
            
            # Daily chat sessions
            chat_pipeline = [
                {"$match": {"createdAt": {"$gte": start_date}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            chat_sessions = list(self.chat_sessions_collection.aggregate(chat_pipeline))
            
            # Top users by activity
            top_users_pipeline = [
                {"$lookup": {
                    "from": "transcripts",
                    "localField": "userId",
                    "foreignField": "userId",
                    "as": "transcripts"
                }},
                {"$lookup": {
                    "from": "chat_sessions",
                    "localField": "userId",
                    "foreignField": "userId",
                    "as": "chatSessions"
                }},
                {"$project": {
                    "email": 1,
                    "username": 1,
                    "transcriptCount": {"$size": "$transcripts"},
                    "chatSessionCount": {"$size": "$chatSessions"},
                    "totalActivity": {"$add": [{"$size": "$transcripts"}, {"$size": "$chatSessions"}]}
                }},
                {"$sort": {"totalActivity": -1}},
                {"$limit": 10}
            ]
            top_users = list(self.users_collection.aggregate(top_users_pipeline))
            
            return {
                "period": f"Last {days} days",
                "dailyRegistrations": registrations,
                "dailyTranscripts": transcripts,
                "dailyChatSessions": chat_sessions,
                "topUsers": top_users,
                "generatedAt": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {e}")
            raise Exception(f"Failed to get analytics: {str(e)}")
    
    async def update_user_subscription(self, user_id: str, plan: str, limits: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's subscription plan and limits"""
        try:
            update = {
                "$set": {
                    "subscription.plan": plan,
                    "subscription.limits": limits,
                    "updatedAt": datetime.utcnow()
                }
            }
            
            result = self.users_collection.update_one({"userId": user_id}, update)
            
            if result.modified_count > 0:
                return {
                    "success": True,
                    "message": "Subscription updated successfully",
                    "userId": user_id,
                    "newPlan": plan,
                    "newLimits": limits
                }
            else:
                raise Exception("User not found or no changes made")
                
        except Exception as e:
            logger.error(f"Error updating subscription for {user_id}: {e}")
            raise Exception(f"Failed to update subscription: {str(e)}")

# Global admin service instance
admin_service = None

def get_admin_service() -> AdminService:
    """Get admin service instance"""
    global admin_service
    if admin_service is None:
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        admin_service = AdminService(mongodb_uri)
    return admin_service 
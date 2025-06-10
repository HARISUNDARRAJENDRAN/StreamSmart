#!/usr/bin/env python3
"""
Admin API Endpoints
Provides administrative access to all user data and system management
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

from services.admin_service import get_admin_service, AdminService

logger = logging.getLogger(__name__)

# Create admin router
admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Admin authentication dependency
security = HTTPBearer()

async def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin authentication - implement your admin auth logic here"""
    # For now, simple admin key check - implement proper admin JWT verification
    admin_key = credentials.credentials
    expected_admin_key = "admin-key-change-this-in-production"  # Use environment variable
    
    if admin_key != expected_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    
    return {"role": "admin", "permissions": ["all"]}

# Pydantic models for admin requests
class ModerationRequest(BaseModel):
    contentId: str
    contentType: str  # "transcript" or "chat_session"
    action: str       # "hide", "unhide", "delete"
    reason: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    userId: str
    plan: str
    limits: Dict[str, Any]

# System overview endpoints
@admin_router.get("/dashboard")
async def get_admin_dashboard(admin: dict = Depends(verify_admin)):
    """Get admin dashboard with system overview"""
    try:
        admin_service = get_admin_service()
        
        # Get system stats
        system_stats = await admin_service.get_system_stats()
        
        # Get recent activity (last 7 days analytics)
        recent_analytics = await admin_service.get_usage_analytics(days=7)
        
        return {
            "systemStats": system_stats.dict(),
            "recentActivity": recent_analytics,
            "timestamp": system_stats.lastUpdated.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting admin dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard data: {str(e)}"
        )

@admin_router.get("/system/stats")
async def get_system_stats(admin: dict = Depends(verify_admin)):
    """Get detailed system statistics"""
    try:
        admin_service = get_admin_service()
        stats = await admin_service.get_system_stats()
        return stats.dict()
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system statistics: {str(e)}"
        )

# User management endpoints
@admin_router.get("/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: dict = Depends(verify_admin)
):
    """Get all users with pagination and search"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.get_all_users(page, limit, search)
        return result
        
    except Exception as e:
        logger.error(f"Error getting all users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )

@admin_router.get("/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(verify_admin)):
    """Get detailed information about a specific user"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.get_user_details(user_id)
        return result
        
    except Exception as e:
        logger.error(f"Error getting user details for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user details: {str(e)}"
        )

@admin_router.put("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    subscription_update: SubscriptionUpdate,
    admin: dict = Depends(verify_admin)
):
    """Update user's subscription plan and limits"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.update_user_subscription(
            user_id, 
            subscription_update.plan, 
            subscription_update.limits
        )
        return result
        
    except Exception as e:
        logger.error(f"Error updating subscription for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )

# Content management endpoints
@admin_router.get("/transcripts")
async def get_all_transcripts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user_id: Optional[str] = Query(None),
    admin: dict = Depends(verify_admin)
):
    """Get all transcripts across all users"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.get_all_transcripts(page, limit, user_id)
        return result
        
    except Exception as e:
        logger.error(f"Error getting all transcripts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transcripts: {str(e)}"
        )

@admin_router.get("/transcripts/{transcript_id}/content")
async def get_transcript_content(transcript_id: str, admin: dict = Depends(verify_admin)):
    """Get full transcript content (admin can access any transcript)"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.get_transcript_content(transcript_id)
        return result
        
    except Exception as e:
        logger.error(f"Error getting transcript content {transcript_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transcript: {str(e)}"
        )

@admin_router.post("/moderate")
async def moderate_content(
    moderation: ModerationRequest,
    admin: dict = Depends(verify_admin)
):
    """Moderate user content (hide, unhide, delete)"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.moderate_content(
            moderation.contentId,
            moderation.contentType,
            moderation.action,
            moderation.reason
        )
        return result
        
    except Exception as e:
        logger.error(f"Error moderating content: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to moderate content: {str(e)}"
        )

# Analytics endpoints
@admin_router.get("/analytics")
async def get_usage_analytics(
    days: int = Query(30, ge=1, le=365),
    admin: dict = Depends(verify_admin)
):
    """Get usage analytics for specified time period"""
    try:
        admin_service = get_admin_service()
        result = await admin_service.get_usage_analytics(days)
        return result
        
    except Exception as e:
        logger.error(f"Error getting usage analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )

# Database inspection endpoints
@admin_router.get("/database/collections")
async def get_database_collections(admin: dict = Depends(verify_admin)):
    """Get information about all database collections"""
    try:
        admin_service = get_admin_service()
        
        collections_info = {}
        
        # Get collection stats
        for collection_name in admin_service.db.list_collection_names():
            collection = admin_service.db[collection_name]
            stats = admin_service.db.command("collStats", collection_name)
            
            collections_info[collection_name] = {
                "documentCount": stats.get("count", 0),
                "avgObjSize": stats.get("avgObjSize", 0),
                "storageSize": stats.get("storageSize", 0),
                "indexCount": stats.get("nindexes", 0),
                "totalIndexSize": stats.get("totalIndexSize", 0)
            }
        
        return {
            "collections": collections_info,
            "totalCollections": len(collections_info)
        }
        
    except Exception as e:
        logger.error(f"Error getting database collections: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get database info: {str(e)}"
        )

@admin_router.get("/database/query")
async def execute_database_query(
    collection: str = Query(..., description="Collection name"),
    query: str = Query(..., description="MongoDB query as JSON string"),
    limit: int = Query(10, ge=1, le=100),
    admin: dict = Depends(verify_admin)
):
    """Execute a direct database query (use with caution)"""
    try:
        import json
        
        admin_service = get_admin_service()
        
        # Parse query
        try:
            query_dict = json.loads(query)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON query"
            )
        
        # Validate collection exists
        if collection not in admin_service.db.list_collection_names():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Collection '{collection}' not found"
            )
        
        # Execute query
        results = list(admin_service.db[collection].find(query_dict).limit(limit))
        
        # Convert ObjectIds to strings
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        
        return {
            "collection": collection,
            "query": query_dict,
            "resultCount": len(results),
            "results": results,
            "limited": len(results) == limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing database query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {str(e)}"
        )

# System maintenance endpoints
@admin_router.post("/maintenance/cleanup")
async def cleanup_expired_data(admin: dict = Depends(verify_admin)):
    """Clean up expired sessions and temporary data"""
    try:
        admin_service = get_admin_service()
        
        from datetime import datetime, timedelta
        
        # Clean up expired sessions
        expired_sessions = admin_service.sessions_collection.delete_many({
            "expiresAt": {"$lt": datetime.utcnow()}
        })
        
        # Clean up old guest sessions (older than 7 days)
        old_guest_sessions = admin_service.sessions_collection.delete_many({
            "type": "guest",
            "createdAt": {"$lt": datetime.utcnow() - timedelta(days=7)}
        })
        
        # Clean up soft-deleted content older than 30 days
        old_deleted_transcripts = admin_service.transcripts_collection.delete_many({
            "isDeleted": True,
            "deletedAt": {"$lt": datetime.utcnow() - timedelta(days=30)}
        })
        
        return {
            "expiredSessionsRemoved": expired_sessions.deleted_count,
            "oldGuestSessionsRemoved": old_guest_sessions.deleted_count,
            "oldDeletedTranscriptsRemoved": old_deleted_transcripts.deleted_count,
            "cleanupTimestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup failed: {str(e)}"
        )

@admin_router.get("/health/detailed")
async def get_detailed_health(admin: dict = Depends(verify_admin)):
    """Get detailed system health information"""
    try:
        admin_service = get_admin_service()
        
        # Test database connection
        db_status = "healthy"
        try:
            admin_service.db.command("ping")
        except Exception:
            db_status = "unhealthy"
        
        # Get collection counts
        collection_counts = {}
        for collection_name in admin_service.db.list_collection_names():
            collection_counts[collection_name] = admin_service.db[collection_name].count_documents({})
        
        # Check for recent errors (you'd implement error logging collection)
        recent_errors = []  # Placeholder for error tracking
        
        return {
            "database": {
                "status": db_status,
                "collections": collection_counts
            },
            "recentErrors": recent_errors,
            "lastChecked": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting detailed health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        ) 
"""
Conversation Memory Service - DynamoDB persistence for chat history
Enables save, load, search, and export of conversations
"""
import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import List, Optional, Dict, Any
import time
from datetime import datetime
import logging
import hashlib
import json

logger = logging.getLogger(__name__)

class ConversationService:
    def __init__(self):
        """Initialize DynamoDB client and table"""
        self.dynamodb = boto3.resource('dynamodb', region_name='ap-south-2')
        self.table_name = 'StreamSmart-Conversations'
        self.table = None
        
        try:
            self.table = self.dynamodb.Table(self.table_name)
            logger.info(f"✅ ConversationService initialized with table: {self.table_name}")
        except Exception as e:
            logger.error(f"Failed to initialize conversation table: {e}")
            # Try to create table if it doesn't exist
            self._create_table_if_not_exists()
    
    def _create_table_if_not_exists(self):
        """Create conversations table if it doesn't exist"""
        try:
            table = self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {'AttributeName': 'PK', 'KeyType': 'HASH'},  # USER#userId
                    {'AttributeName': 'SK', 'KeyType': 'RANGE'}   # CONV#timestamp
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'PK', 'AttributeType': 'S'},
                    {'AttributeName': 'SK', 'AttributeType': 'S'},
                    {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                    {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'GSI1',
                        'KeySchema': [
                            {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                            {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'BillingMode': 'PAY_PER_REQUEST'
                    }
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            
            # Wait for table to be created
            table.meta.client.get_waiter('table_exists').wait(TableName=self.table_name)
            self.table = table
            logger.info(f"✅ Created conversation table: {self.table_name}")
            
        except Exception as e:
            logger.error(f"Failed to create conversation table: {e}")
    
    def save_conversation(
        self,
        user_id: str,
        playlist_id: str,
        messages: List[Dict[str, Any]],
        title: Optional[str] = None,
        conversation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save or update a conversation
        
        Args:
            user_id: User identifier
            playlist_id: Associated playlist
            messages: List of message objects
            title: Conversation title (auto-generated if None)
            conversation_id: Existing conversation ID for updates
            metadata: Additional metadata
            
        Returns:
            Saved conversation object
        """
        try:
            if not self.table:
                raise Exception("Conversation table not initialized")
            
            # Generate conversation ID if new
            if not conversation_id:
                timestamp = int(time.time() * 1000)
                conversation_id = f"conv_{timestamp}_{hashlib.md5(user_id.encode()).hexdigest()[:8]}"
            else:
                # Extract timestamp from existing ID
                parts = conversation_id.split('_')
                timestamp = int(parts[1]) if len(parts) > 1 else int(time.time() * 1000)
            
            # Auto-generate title from first user message if not provided
            if not title and messages:
                first_user_msg = next((m for m in messages if m.get('role') == 'user'), None)
                if first_user_msg:
                    content = first_user_msg.get('content', '')
                    title = self._generate_title(content)
                else:
                    title = "New Conversation"
            
            # Extract topics from messages (simple keyword extraction)
            topics = self._extract_topics(messages)
            
            # Build searchable content for full-text search
            searchable_content = " ".join([
                msg.get('content', '') for msg in messages
            ])
            
            now = datetime.now().isoformat()
            
            # Prepare item
            item = {
                'PK': f"USER#{user_id}",
                'SK': f"CONV#{timestamp}",
                'conversationId': conversation_id,
                'playlistId': playlist_id,
                'title': title,
                'messages': messages,
                'messageCount': len(messages),
                'topics': topics,
                'searchableContent': searchable_content[:10000],  # DynamoDB limit
                'starred': metadata.get('starred', False) if metadata else False,
                'archived': metadata.get('archived', False) if metadata else False,
                'createdAt': metadata.get('createdAt', now) if metadata else now,
                'updatedAt': now,
                'lastAccessedAt': now,
                
                # GSI for playlist-based queries
                'GSI1PK': f"PLAYLIST#{playlist_id}",
                'GSI1SK': f"CONV#{timestamp}",
            }
            
            # Add video context if available
            video_ids = set()
            for msg in messages:
                if msg.get('sources'):
                    for source in msg['sources']:
                        if source.get('videoId'):
                            video_ids.add(source['videoId'])
            
            if video_ids:
                item['videoContext'] = list(video_ids)
            
            # Save to DynamoDB
            self.table.put_item(Item=item)
            
            logger.info(f"✅ Saved conversation: {conversation_id} ({len(messages)} messages)")
            
            return {
                'conversationId': conversation_id,
                'title': title,
                'messageCount': len(messages),
                'updatedAt': now
            }
            
        except Exception as e:
            logger.error(f"Error saving conversation: {e}", exc_info=True)
            raise
    
    def get_conversation(
        self,
        user_id: str,
        conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a specific conversation by ID"""
        try:
            if not self.table:
                return None
            
            # Extract timestamp from conversation ID
            parts = conversation_id.split('_')
            timestamp = int(parts[1]) if len(parts) > 1 else None
            
            if not timestamp:
                logger.error(f"Invalid conversation ID format: {conversation_id}")
                return None
            
            response = self.table.get_item(
                Key={
                    'PK': f"USER#{user_id}",
                    'SK': f"CONV#{timestamp}"
                }
            )
            
            if 'Item' in response:
                # Update last accessed time
                self.table.update_item(
                    Key={
                        'PK': f"USER#{user_id}",
                        'SK': f"CONV#{timestamp}"
                    },
                    UpdateExpression='SET lastAccessedAt = :now',
                    ExpressionAttributeValues={
                        ':now': datetime.now().isoformat()
                    }
                )
                
                return response['Item']
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            return None
    
    def list_conversations(
        self,
        user_id: str,
        playlist_id: Optional[str] = None,
        limit: int = 20,
        last_key: Optional[Dict] = None,
        archived: bool = False
    ) -> Dict[str, Any]:
        """
        List conversations for a user
        
        Args:
            user_id: User identifier
            playlist_id: Filter by playlist (uses GSI)
            limit: Max results
            last_key: Pagination cursor
            archived: Include archived conversations
            
        Returns:
            Dict with conversations and nextCursor
        """
        try:
            if not self.table:
                return {'conversations': [], 'nextCursor': None}
            
            if playlist_id:
                # Query by playlist using GSI
                query_kwargs = {
                    'IndexName': 'GSI1',
                    'KeyConditionExpression': Key('GSI1PK').eq(f"PLAYLIST#{playlist_id}"),
                    'Limit': limit,
                    'ScanIndexForward': False  # Most recent first
                }
            else:
                # Query by user
                query_kwargs = {
                    'KeyConditionExpression': Key('PK').eq(f"USER#{user_id}") & Key('SK').begins_with('CONV#'),
                    'Limit': limit,
                    'ScanIndexForward': False
                }
            
            # Filter archived
            if not archived:
                query_kwargs['FilterExpression'] = Attr('archived').eq(False) | Attr('archived').not_exists()
            
            # Pagination
            if last_key:
                query_kwargs['ExclusiveStartKey'] = last_key
            
            response = self.table.query(**query_kwargs)
            
            conversations = []
            for item in response.get('Items', []):
                # Return summary only
                conversations.append({
                    'conversationId': item.get('conversationId'),
                    'title': item.get('title'),
                    'playlistId': item.get('playlistId'),
                    'messageCount': item.get('messageCount', 0),
                    'topics': item.get('topics', []),
                    'starred': item.get('starred', False),
                    'archived': item.get('archived', False),
                    'createdAt': item.get('createdAt'),
                    'updatedAt': item.get('updatedAt'),
                    'preview': self._get_message_preview(item.get('messages', []))
                })
            
            return {
                'conversations': conversations,
                'nextCursor': response.get('LastEvaluatedKey')
            }
            
        except Exception as e:
            logger.error(f"Error listing conversations: {e}")
            return {'conversations': [], 'nextCursor': None}
    
    def delete_conversation(
        self,
        user_id: str,
        conversation_id: str
    ) -> bool:
        """Delete a conversation"""
        try:
            if not self.table:
                return False
            
            parts = conversation_id.split('_')
            timestamp = int(parts[1]) if len(parts) > 1 else None
            
            if not timestamp:
                return False
            
            self.table.delete_item(
                Key={
                    'PK': f"USER#{user_id}",
                    'SK': f"CONV#{timestamp}"
                }
            )
            
            logger.info(f"✅ Deleted conversation: {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            return False
    
    def update_metadata(
        self,
        user_id: str,
        conversation_id: str,
        title: Optional[str] = None,
        starred: Optional[bool] = None,
        archived: Optional[bool] = None
    ) -> bool:
        """Update conversation metadata"""
        try:
            if not self.table:
                return False
            
            parts = conversation_id.split('_')
            timestamp = int(parts[1]) if len(parts) > 1 else None
            
            if not timestamp:
                return False
            
            # Build update expression
            updates = []
            values = {}
            
            if title is not None:
                updates.append('title = :title')
                values[':title'] = title
            
            if starred is not None:
                updates.append('starred = :starred')
                values[':starred'] = starred
            
            if archived is not None:
                updates.append('archived = :archived')
                values[':archived'] = archived
            
            if not updates:
                return True
            
            updates.append('updatedAt = :now')
            values[':now'] = datetime.now().isoformat()
            
            self.table.update_item(
                Key={
                    'PK': f"USER#{user_id}",
                    'SK': f"CONV#{timestamp}"
                },
                UpdateExpression=f"SET {', '.join(updates)}",
                ExpressionAttributeValues=values
            )
            
            logger.info(f"✅ Updated conversation metadata: {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating metadata: {e}")
            return False
    
    def search_conversations(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search conversations by content
        Note: This is a simple implementation. For production, use OpenSearch
        """
        try:
            if not self.table:
                return []
            
            # Get all user conversations
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f"USER#{user_id}") & Key('SK').begins_with('CONV#'),
                FilterExpression=Attr('searchableContent').contains(query.lower())
            )
            
            results = []
            for item in response.get('Items', [])[:limit]:
                results.append({
                    'conversationId': item.get('conversationId'),
                    'title': item.get('title'),
                    'messageCount': item.get('messageCount', 0),
                    'highlight': self._find_highlight(item.get('searchableContent', ''), query),
                    'updatedAt': item.get('updatedAt')
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching conversations: {e}")
            return []
    
    def export_conversation(
        self,
        user_id: str,
        conversation_id: str,
        format: str = 'markdown'
    ) -> str:
        """Export conversation in various formats"""
        conversation = self.get_conversation(user_id, conversation_id)
        
        if not conversation:
            return ""
        
        if format == 'markdown':
            return self._export_markdown(conversation)
        elif format == 'json':
            return json.dumps(conversation, indent=2)
        elif format == 'html':
            return self._export_html(conversation)
        else:
            return ""
    
    # Helper methods
    
    def _generate_title(self, first_message: str, max_length: int = 50) -> str:
        """Generate a concise title from first message"""
        # Simple truncation - could use GPT for better titles
        title = first_message.strip()
        if len(title) > max_length:
            title = title[:max_length] + "..."
        return title
    
    def _extract_topics(self, messages: List[Dict], max_topics: int = 5) -> List[str]:
        """Extract key topics from conversation (simple keyword extraction)"""
        # Simple implementation - could use NLP for better extraction
        words = []
        for msg in messages:
            content = msg.get('content', '').lower()
            words.extend(content.split())
        
        # Count frequency
        from collections import Counter
        word_counts = Counter(words)
        
        # Filter common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'this', 'that'}
        topics = [word for word, _ in word_counts.most_common(max_topics * 2) 
                 if len(word) > 3 and word not in stop_words]
        
        return topics[:max_topics]
    
    def _get_message_preview(self, messages: List[Dict], max_length: int = 100) -> str:
        """Get preview of first user message"""
        first_user = next((m for m in messages if m.get('role') == 'user'), None)
        if first_user:
            content = first_user.get('content', '')
            if len(content) > max_length:
                return content[:max_length] + "..."
            return content
        return ""
    
    def _find_highlight(self, text: str, query: str, context: int = 50) -> str:
        """Find and highlight query in text with context"""
        text_lower = text.lower()
        query_lower = query.lower()
        
        index = text_lower.find(query_lower)
        if index == -1:
            return text[:100] + "..."
        
        start = max(0, index - context)
        end = min(len(text), index + len(query) + context)
        
        snippet = text[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
        
        return snippet
    
    def _export_markdown(self, conversation: Dict) -> str:
        """Export conversation as markdown"""
        md = f"# {conversation.get('title', 'Conversation')}\n\n"
        md += f"**Date:** {conversation.get('createdAt', 'Unknown')}\n"
        md += f"**Messages:** {conversation.get('messageCount', 0)}\n"
        
        if conversation.get('topics'):
            md += f"**Topics:** {', '.join(conversation['topics'])}\n"
        
        md += "\n---\n\n"
        
        for msg in conversation.get('messages', []):
            role = msg.get('role', 'user').title()
            content = msg.get('content', '')
            timestamp = msg.get('timestamp', '')
            
            md += f"## {role}\n"
            if timestamp:
                md += f"*{timestamp}*\n\n"
            md += f"{content}\n\n"
            
            # Add sources if present
            if msg.get('sources'):
                md += "**Sources:**\n"
                for source in msg['sources']:
                    md += f"- {source.get('videoTitle', 'Unknown')}\n"
                md += "\n"
            
            md += "---\n\n"
        
        return md
    
    def _export_html(self, conversation: Dict) -> str:
        """Export conversation as HTML"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{conversation.get('title', 'Conversation')}</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                .message {{ margin: 20px 0; padding: 15px; border-radius: 8px; }}
                .user {{ background: #e3f2fd; }}
                .assistant {{ background: #f5f5f5; }}
                .timestamp {{ color: #666; font-size: 0.9em; }}
            </style>
        </head>
        <body>
            <h1>{conversation.get('title', 'Conversation')}</h1>
            <p><strong>Date:</strong> {conversation.get('createdAt', 'Unknown')}</p>
        """
        
        for msg in conversation.get('messages', []):
            role = msg.get('role', 'user')
            content = msg.get('content', '').replace('\n', '<br>')
            timestamp = msg.get('timestamp', '')
            
            html += f"""
            <div class="message {role}">
                <strong>{role.title()}</strong>
                <div class="timestamp">{timestamp}</div>
                <p>{content}</p>
            </div>
            """
        
        html += "</body></html>"
        return html

# Global singleton
conversation_service = ConversationService()

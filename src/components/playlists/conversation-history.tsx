'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MessageSquare,
  Star,
  StarOff,
  Trash2,
  Download,
  Archive,
  ArchiveRestore,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConversationItem {
  conversationId: string;
  title: string;
  playlistId: string;
  messageCount: number;
  topics: string[];
  starred: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  preview: string;
}

interface ConversationHistoryProps {
  userId: string;
  playlistId?: string;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string;
  className?: string;
}

export function ConversationHistory({
  userId,
  playlistId,
  onSelectConversation,
  currentConversationId,
  className,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [userId, playlistId, showArchived]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const params = new URLSearchParams({
        archived: showArchived.toString(),
      });
      
      if (playlistId) {
        params.append('playlist_id', playlistId);
      }
      
      const response = await fetch(
        `${backendUrl}/conversations/${userId}?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (conversationId: string, currentStarred: boolean) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/conversations/${userId}/${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            starred: !currentStarred,
          }),
        }
      );

      if (response.ok) {
        // Update local state
        setConversations(prev =>
          prev.map(conv =>
            conv.conversationId === conversationId
              ? { ...conv, starred: !currentStarred }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const toggleArchive = async (conversationId: string, currentArchived: boolean) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/conversations/${userId}/${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            archived: !currentArchived,
          }),
        }
      );

      if (response.ok) {
        // Remove from current view
        setConversations(prev =>
          prev.filter(conv => conv.conversationId !== conversationId)
        );
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/conversations/${userId}/${conversationId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setConversations(prev =>
          prev.filter(conv => conv.conversationId !== conversationId)
        );
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const exportConversation = async (conversationId: string, format: 'markdown' | 'json' | 'html') => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/conversations/${userId}/${conversationId}/export?format=${format}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversationId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting conversation:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    searchQuery
      ? conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-1" />
                Active
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-1" />
                Archived
              </>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery
                ? 'No conversations found'
                : showArchived
                ? 'No archived conversations'
                : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.conversationId}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50',
                  currentConversationId === conv.conversationId &&
                    'bg-muted border-primary'
                )}
                onClick={() => onSelectConversation(conv.conversationId)}
              >
                {/* Title and Actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm line-clamp-1 flex-1">
                    {conv.title}
                  </h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(conv.conversationId, conv.starred);
                      }}
                    >
                      {conv.starred ? (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportConversation(conv.conversationId, 'markdown');
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArchive(conv.conversationId, conv.archived);
                      }}
                    >
                      {conv.archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv.conversationId);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {conv.preview}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(conv.updatedAt)}</span>
                  <span>•</span>
                  <span>{conv.messageCount} messages</span>
                </div>

                {/* Topics */}
                {conv.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conv.topics.slice(0, 3).map((topic, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The conversation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && deleteConversation(conversationToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

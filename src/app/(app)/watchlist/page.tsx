'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Bookmark, 
  Clock, 
  Star, 
  Search, 
  Filter,
  Play,
  CheckCircle,
  Pause,
  Trash2,
  Edit3,
  FolderPlus
} from 'lucide-react';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { feedbackService } from '@/services/feedbackService';
import { playlistService } from '@/services/playlistService';
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { AddToPlaylistDialog } from '@/components/watchlist/add-to-playlist-dialog';

interface WatchlistItem {
  id: string;
  itemId: string;
  itemType: 'video' | 'playlist';
  itemDetails: {
    title: string;
    thumbnail: string;
    duration?: string;
    description?: string;
    creator?: string;
  };
  addedFrom: string;
  priority: number;
  notes?: string;
  status: 'want_to_watch' | 'watching' | 'completed' | 'paused';
  completionPercentage: number;
  createdAt: string;
}

const statusColors = {
  want_to_watch: 'bg-blue-100 text-blue-800',
  watching: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  paused: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  want_to_watch: Bookmark,
  watching: Play,
  completed: CheckCircle,
  paused: Pause
};

const priorityColors = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800'
};

export default function WatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const loadWatchlist = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await feedbackService.getUserWatchlist(user.id, {
          sortBy,
          sortOrder,
          limit: 100
        });

        if (result.success) {
          // Ensure consistent id field mapping
          const processedItems = result.watchlistItems.map((item: any) => ({
            ...item,
            id: item.id || item._id?.toString() || item._id
          }));
          setWatchlistItems(processedItems);
        } else {
          toast({
            title: "Error",
            description: "Failed to load watchlist. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading watchlist:", error);
        toast({
          title: "Error",
          description: "Failed to load watchlist. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWatchlist();
  }, [user, sortBy, sortOrder]);

  // Filter and search items
  useEffect(() => {
    let filtered = [...watchlistItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.itemDetails.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemDetails.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === parseInt(priorityFilter));
    }

    setFilteredItems(filtered);
  }, [watchlistItems, searchQuery, statusFilter, priorityFilter]);

  const handleStatusUpdate = async (watchlistId: string, newStatus: string) => {
    if (!user) return;

    try {
      const updates: any = { status: newStatus };
      
      // Auto-update completion percentage based on status
      if (newStatus === 'completed') {
        updates.completionPercentage = 100;
        updates.watchedAt = new Date();
      } else if (newStatus === 'want_to_watch') {
        updates.completionPercentage = 0;
      }

      const result = await feedbackService.updateWatchlistItem(watchlistId, user.id, updates);

      if (result.success) {
        setWatchlistItems(prev => 
          prev.map(item => 
            item.id === watchlistId 
              ? { ...item, ...updates }
              : item
          )
        );

        toast({
          title: "Status Updated",
          description: `Item status changed to ${newStatus.replace('_', ' ')}.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update status. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePriorityUpdate = async (watchlistId: string, newPriority: number) => {
    if (!user) return;

    try {
      const result = await feedbackService.updateWatchlistItem(watchlistId, user.id, {
        priority: newPriority
      });

      if (result.success) {
        setWatchlistItems(prev => 
          prev.map(item => 
            item.id === watchlistId 
              ? { ...item, priority: newPriority }
              : item
          )
        );

        toast({
          title: "Priority Updated",
          description: `Priority set to ${newPriority}.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update priority. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  const handleRemoveFromWatchlist = async (watchlistId: string, itemTitle: string) => {
    if (!user) return;

    console.log('Attempting to delete watchlist item:', { watchlistId, userId: user.id, itemTitle });

    try {
      const result = await feedbackService.removeFromWatchlist(watchlistId, user.id);

      if (result.success) {
        setWatchlistItems(prev => prev.filter(item => item.id !== watchlistId));
        
        toast({
          title: "Removed from Watchlist",
          description: `"${itemTitle}" has been removed from your watchlist.`,
        });
      } else {
        console.error('Failed to remove item:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to remove item. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatsData = () => {
    const total = watchlistItems.length;
    const completed = watchlistItems.filter(item => item.status === 'completed').length;
    const watching = watchlistItems.filter(item => item.status === 'watching').length;
    const wantToWatch = watchlistItems.filter(item => item.status === 'want_to_watch').length;
    
    return { total, completed, watching, wantToWatch };
  };

  const stats = getStatsData();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your watchlist...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Bookmark className="h-8 w-8 text-primary" />
              My Watchlist
            </h1>
            <p className="text-muted-foreground">
              Manage your saved content and track your learning progress
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Bookmark className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Want to Watch</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.wantToWatch}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search watchlist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="want_to_watch">Want to Watch</SelectItem>
                  <SelectItem value="watching">Currently Watching</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="5">High Priority (5)</SelectItem>
                  <SelectItem value="4">Priority 4</SelectItem>
                  <SelectItem value="3">Normal Priority (3)</SelectItem>
                  <SelectItem value="2">Priority 2</SelectItem>
                  <SelectItem value="1">Low Priority (1)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="priority-desc">High Priority First</SelectItem>
                  <SelectItem value="priority-asc">Low Priority First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist Items */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items in your watchlist</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "No items match your current filters."
                  : "Start adding content to your watchlist from recommendations!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => {
              const StatusIcon = statusIcons[item.status];
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="relative w-32 h-24 flex-shrink-0">
                      <Image
                        src={item.itemDetails.thumbnail}
                        alt={item.itemDetails.title}
                        fill
                        className="object-cover"
                      />
                      {/* Status overlay */}
                      <div className="absolute top-1 left-1">
                        <Badge className={statusColors[item.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold line-clamp-2 flex-1">
                          {item.itemDetails.title}
                        </h3>
                        <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                          P{item.priority}
                        </Badge>
                      </div>

                      {item.itemDetails.creator && (
                        <p className="text-sm text-muted-foreground mb-2">
                          by {item.itemDetails.creator}
                        </p>
                      )}

                      {item.itemDetails.duration && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.itemDetails.duration}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          Note: {item.notes}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Update */}
                        <Select 
                          value={item.status} 
                          onValueChange={(value) => handleStatusUpdate(item.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="want_to_watch">Want to Watch</SelectItem>
                            <SelectItem value="watching">Watching</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Priority Update */}
                        <Select 
                          value={item.priority.toString()} 
                          onValueChange={(value) => handlePriorityUpdate(item.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">P5</SelectItem>
                            <SelectItem value="4">P4</SelectItem>
                            <SelectItem value="3">P3</SelectItem>
                            <SelectItem value="2">P2</SelectItem>
                            <SelectItem value="1">P1</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFromWatchlist(item.id, item.itemDetails.title)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Add to Playlist Button */}
                        <AddToPlaylistDialog item={item} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
} 
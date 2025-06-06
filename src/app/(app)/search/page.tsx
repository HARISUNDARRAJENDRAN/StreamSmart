'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  SearchIcon, 
  FilterIcon, 
  Clock, 
  User, 
  PlayCircle, 
  ListVideo,
  TrendingUp,
  X
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useImplicitTracking } from '@/hooks/useImplicitTracking';
import { motion } from 'framer-motion';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  type: 'video' | 'playlist' | 'creator';
  creator?: string;
  duration?: string;
  views?: number;
  createdAt: string;
}

interface SearchHistoryItem {
  id: string;
  searchQuery: string;
  searchType: string;
  resultsFound: number;
  searchSuccessful: boolean;
  createdAt: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { trackSearchQuery, trackSearchClick, trackSearchRefine, endSearch } = useImplicitTracking();
  
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [searchType, setSearchType] = useState<'content' | 'creator' | 'category'>('content');

  // Load search history on mount
  useEffect(() => {
    if (user?.id) {
      loadSearchHistory();
    }
  }, [user?.id]);

  // Perform search when query changes
  useEffect(() => {
    const query = searchParams?.get('q');
    if (query && query !== searchQuery) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const loadSearchHistory = async () => {
    try {
      const response = await fetch(`/api/tracking/search-history?userId=${user?.id}&limit=10`);
      if (response.ok) {
        const result = await response.json();
        setSearchHistory(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const performSearch = async (query: string, type: 'content' | 'creator' | 'category' = 'content') => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Track search query
      await trackSearchQuery({
        searchQuery: query,
        searchType: type,
        source: 'search_page',
        sessionId: '', // Auto-generated
        device: 'desktop',
        userAgent: navigator.userAgent,
        resultsFound: 0, // Will be updated after we get results
        resultsDisplayed: 0,
      });

      // Mock search results (replace with actual API call)
      const mockResults: SearchResult[] = generateMockResults(query, type);
      
      setSearchResults(mockResults);
      
      // Update the tracked search with results count
      // Note: In a real implementation, you'd update the search record with actual results
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResults = (query: string, type: string): SearchResult[] => {
    // Mock search results based on query and type
    const mockData: SearchResult[] = [
      {
        id: 'video-1',
        title: `${query} - Complete Tutorial`,
        description: `Learn everything about ${query} in this comprehensive tutorial. Perfect for beginners and advanced users.`,
        thumbnail: 'https://placehold.co/320x180.png',
        type: 'video',
        creator: 'TechEdu',
        duration: '45:30',
        views: 125000,
        createdAt: '2024-01-10',
      },
      {
        id: 'playlist-1',
        title: `${query} Masterclass Series`,
        description: `A complete playlist covering all aspects of ${query}. 12 videos, 8 hours of content.`,
        thumbnail: 'https://placehold.co/320x180.png',
        type: 'playlist',
        creator: 'SkillAcademy',
        duration: '8h 15m',
        views: 89000,
        createdAt: '2024-01-08',
      },
      {
        id: 'video-2',
        title: `Advanced ${query} Techniques`,
        description: `Take your ${query} skills to the next level with these advanced techniques and best practices.`,
        thumbnail: 'https://placehold.co/320x180.png',
        type: 'video',
        creator: 'ProDev',
        duration: '32:15',
        views: 67000,
        createdAt: '2024-01-05',
      },
    ];

    return mockData.filter(item => 
      type === 'content' || 
      (type === 'creator' && item.creator?.toLowerCase().includes(query.toLowerCase())) ||
      (type === 'category' && item.title.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleResultClick = async (result: SearchResult, position: number) => {
    // Track search result click
    await trackSearchClick({
      itemId: result.id,
      itemType: result.type === 'video' ? 'video' : result.type === 'playlist' ? 'playlist' : 'creator',
      position: position + 1, // 1-based position
    });

    // Navigate to result (mock navigation)
    if (result.type === 'playlist') {
      router.push(`/playlists/${result.id}`);
    } else {
      // For videos, you could navigate to a video player page
      console.log(`Opening ${result.type}: ${result.title}`);
    }
  };

  const handleFilterChange = async (newSortBy: string) => {
    setSortBy(newSortBy);
    
    // Track search refinement
    await trackSearchRefine({
      refinementType: 'sort',
      refinementValue: newSortBy,
    });
  };

  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab);
    
    // Track category refinement
    await trackSearchRefine({
      refinementType: 'category',
      refinementValue: newTab,
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  const useHistoryQuery = (historyItem: SearchHistoryItem) => {
    setSearchQuery(historyItem.searchQuery);
    router.push(`/search?q=${encodeURIComponent(historyItem.searchQuery)}`);
  };

  const filteredResults = searchResults.filter(result => {
    if (activeTab === 'all') return true;
    if (activeTab === 'videos') return result.type === 'video';
    if (activeTab === 'playlists') return result.type === 'playlist';
    if (activeTab === 'creators') return result.type === 'creator';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <SearchIcon className="h-8 w-8 text-primary" />
            Search
          </h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search videos, playlists, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isLoading}>
                Search
              </Button>
            </div>
          </form>

          {/* Search History */}
          {searchHistory.length > 0 && !searchQuery && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Searches
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearSearchHistory}>
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 8).map((item) => (
                    <Badge
                      key={item.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => useHistoryQuery(item)}
                    >
                      {item.searchQuery}
                      {item.searchSuccessful && (
                        <TrendingUp className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  Search results for "{searchQuery}"
                </h2>
                <p className="text-muted-foreground">
                  {isLoading ? 'Searching...' : `${filteredResults.length} results found`}
                </p>
              </div>
              
              {/* Sort & Filter */}
              <div className="flex items-center gap-4">
                <Select value={sortBy} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-40">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="views">Most Views</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All ({searchResults.length})</TabsTrigger>
                <TabsTrigger value="videos">
                  Videos ({searchResults.filter(r => r.type === 'video').length})
                </TabsTrigger>
                <TabsTrigger value="playlists">
                  Playlists ({searchResults.filter(r => r.type === 'playlist').length})
                </TabsTrigger>
                <TabsTrigger value="creators">
                  Creators ({searchResults.filter(r => r.type === 'creator').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Results List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredResults.length > 0 ? (
                filteredResults.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div 
                          className="flex gap-4"
                          onClick={() => handleResultClick(result, index)}
                        >
                          <div className="relative">
                            <img
                              src={result.thumbnail}
                              alt={result.title}
                              className="w-32 h-20 object-cover rounded"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                              {result.type === 'video' ? (
                                <PlayCircle className="h-8 w-8 text-white" />
                              ) : result.type === 'playlist' ? (
                                <ListVideo className="h-8 w-8 text-white" />
                              ) : (
                                <User className="h-8 w-8 text-white" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                              {result.title}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {result.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {result.creator && (
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {result.creator}
                                </span>
                              )}
                              {result.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {result.duration}
                                </span>
                              )}
                              {result.views && (
                                <span>
                                  {result.views.toLocaleString()} views
                                </span>
                              )}
                              <Badge variant="outline">
                                {result.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    Try different keywords or check your spelling
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
} 
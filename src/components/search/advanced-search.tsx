"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Clock,
  Star,
  TrendingUp,
  Timer,
  History,
  Bookmark,
  X,
  Loader2,
  Play,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  video_id: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  topics: string[];
  difficulty: string;
  relevance_score: number;
  match_type: string;
  snippet: string;
}

interface SearchFilters {
  topics?: string[];
  difficulty?: string;
  min_duration?: number;
  max_duration?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

interface AdvancedSearchProps {
  userId?: string;
  onResultClick?: (videoId: string) => void;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: Star },
  { value: 'recency', label: 'Most Recent', icon: Clock },
  { value: 'popularity', label: 'Most Popular', icon: TrendingUp },
  { value: 'duration', label: 'Shortest First', icon: Timer },
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const TOPICS = [
  'Programming', 'Web Development', 'Data Science', 'Machine Learning',
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'History', 'Economics', 'Psychology', 'Philosophy'
];

export default function AdvancedSearch({ userId, onResultClick }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  
  // History & Saved
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history and saved searches on mount
  useEffect(() => {
    if (userId) {
      loadSearchHistory();
      loadSavedSearches();
    }
  }, [userId]);

  // Debounced instant search
  useEffect(() => {
    if (query.length >= 3) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const loadSearchHistory = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:8000/search/history/${userId}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadSavedSearches = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:8000/search/saved/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data.saved_searches || []);
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Build filters object
      const searchFilters: SearchFilters = {};
      if (selectedTopics.length > 0) searchFilters.topics = selectedTopics;
      if (selectedDifficulty) searchFilters.difficulty = selectedDifficulty;
      if (filters.min_duration) searchFilters.min_duration = filters.min_duration;
      if (filters.max_duration) searchFilters.max_duration = filters.max_duration;

      const response = await fetch('http://localhost:8000/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          user_id: userId,
          filters: Object.keys(searchFilters).length > 0 ? searchFilters : null,
          sort_by: sortBy,
          limit: 20
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      
      // Reload history
      if (userId) {
        setTimeout(loadSearchHistory, 1000);
      }

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!userId || !query.trim()) return;

    const name = prompt('Name this search:');
    if (!name) return;

    try {
      const response = await fetch('http://localhost:8000/search/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name,
          query: query.trim(),
          filters: selectedTopics.length > 0 || selectedDifficulty ? {
            topics: selectedTopics,
            difficulty: selectedDifficulty
          } : null
        })
      });

      if (response.ok) {
        await loadSavedSearches();
      }
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const handleUseSavedSearch = (search: any) => {
    setQuery(search.query);
    if (search.filters?.topics) setSelectedTopics(search.filters.topics);
    if (search.filters?.difficulty) setSelectedDifficulty(search.filters.difficulty);
    setShowHistory(false);
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (!userId) return;
    try {
      await fetch(`http://localhost:8000/search/saved/${userId}/${searchId}`, {
        method: 'DELETE'
      });
      await loadSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const clearFilters = () => {
    setSelectedTopics([]);
    setSelectedDifficulty('');
    setFilters({});
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search across all videos..."
                className="pl-10 pr-10"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            {userId && (
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex gap-2">
              {SORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSortBy(option.value);
                      if (results.length > 0) handleSearch();
                    }}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topics */}
            <div>
              <label className="text-sm font-medium mb-2 block">Topics</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <Badge
                    key={topic}
                    variant={selectedTopics.includes(topic) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Any difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any difficulty</SelectItem>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Min Duration (min)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.min_duration ? Math.floor(filters.min_duration / 60) : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    min_duration: parseInt(e.target.value) * 60 || undefined
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Duration (min)</label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.max_duration ? Math.floor(filters.max_duration / 60) : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    max_duration: parseInt(e.target.value) * 60 || undefined
                  }))}
                />
              </div>
            </div>

            <Button onClick={handleSearch} className="w-full">
              Apply Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History & Saved Searches */}
      {showHistory && userId && (
        <Card>
          <Tabs defaultValue="history">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="saved">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="history" className="space-y-2">
                {searchHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No search history yet
                  </p>
                ) : (
                  searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(item.query);
                        setShowHistory(false);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.query}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.results_count} results
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </TabsContent>
              <TabsContent value="saved" className="space-y-2">
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved searches yet
                  </p>
                ) : (
                  savedSearches.map((search) => (
                    <div
                      key={search.search_id}
                      className="p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => handleUseSavedSearch(search)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-sm">{search.name}</div>
                          <div className="text-xs text-muted-foreground">{search.query}</div>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSavedSearch(search.search_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </h3>
            {userId && query && (
              <Button variant="outline" size="sm" onClick={handleSaveSearch}>
                <Bookmark className="h-4 w-4 mr-2" />
                Save Search
              </Button>
            )}
          </div>

          {results.map((result) => (
            <Card
              key={result.video_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onResultClick?.(result.video_id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {result.thumbnail && (
                    <div className="flex-shrink-0">
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-32 h-20 object-cover rounded"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1 line-clamp-2">
                      {result.title}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {result.snippet}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {result.difficulty}
                      </Badge>
                      {result.duration && (
                        <Badge variant="outline" className="text-xs">
                          <Timer className="h-3 w-3 mr-1" />
                          {formatDuration(result.duration)}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {(result.relevance_score * 100).toFixed(0)}% match
                      </Badge>
                      {result.topics.slice(0, 2).map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0 flex items-center">
                    <Button size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && query && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

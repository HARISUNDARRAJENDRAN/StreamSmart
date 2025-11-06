'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, MessageSquare, BookOpen, Search, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SuggestedQuestion {
  id: string;
  text: string;
  category: 'summary' | 'concept' | 'navigation' | 'study' | 'practice';
  icon?: string;
  priority: number;
}

interface SuggestedQuestionsProps {
  videoIds: string[];
  onQuestionClick: (question: string) => void;
  className?: string;
  maxSuggestions?: number;
}

const categoryIcons = {
  summary: BookOpen,
  concept: Lightbulb,
  navigation: Search,
  study: MessageSquare,
  practice: Zap,
};

const categoryColors = {
  summary: 'bg-gray-100 text-black hover:bg-gray-200 border-gray-300',
  concept: 'bg-gray-100 text-black hover:bg-gray-200 border-gray-300',
  navigation: 'bg-gray-100 text-black hover:bg-gray-200 border-gray-300',
  study: 'bg-gray-100 text-black hover:bg-gray-200 border-gray-300',
  practice: 'bg-gray-100 text-black hover:bg-gray-200 border-gray-300',
};

export function SuggestedQuestions({
  videoIds,
  onQuestionClick,
  className,
  maxSuggestions = 4,
}: SuggestedQuestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!videoIds || videoIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/generate-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoIds,
            maxSuggestions,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Could not load suggestions');
        // Fallback to default suggestions
        setSuggestions(getDefaultSuggestions());
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [videoIds, maxSuggestions]);

  const getDefaultSuggestions = (): SuggestedQuestion[] => {
    return [
      {
        id: 'default-1',
        text: 'Summarize this video',
        category: 'summary',
        priority: 1,
      },
      {
        id: 'default-2',
        text: 'What are the main concepts?',
        category: 'concept',
        priority: 2,
      },
      {
        id: 'default-3',
        text: 'Explain the key points',
        category: 'study',
        priority: 3,
      },
    ];
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-4', className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading suggestions...
        </span>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return null; // Silently fail - suggestions are optional
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-xs text-black/50 font-semibold uppercase tracking-wider">
        <Lightbulb className="h-4 w-4" />
        <span>Suggested questions</span>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {suggestions.slice(0, maxSuggestions).map((suggestion) => {
          const Icon = categoryIcons[suggestion.category];
          const colorClass = categoryColors[suggestion.category];

          return (
            <Button
              key={suggestion.id}
              variant="outline"
              onClick={() => onQuestionClick(suggestion.text)}
              className={cn(
                'h-auto py-3 px-4 justify-start text-left transition-all duration-200 border-2 rounded-[14px]',
                'hover:shadow-md hover:scale-[1.01] active:scale-95',
                colorClass
              )}
            >
              <Icon className="h-4 w-4 mr-3 flex-shrink-0 text-black/60" />
              <span className="text-sm font-medium text-black line-clamp-2">{suggestion.text}</span>
            </Button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-black/40">
          Showing default suggestions
        </p>
      )}
    </div>
  );
}

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
  summary: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200',
  concept: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200',
  navigation: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-200',
  study: 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200',
  practice: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200',
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
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span className="font-medium">Suggested questions:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, maxSuggestions).map((suggestion) => {
          const Icon = categoryIcons[suggestion.category];
          const colorClass = categoryColors[suggestion.category];

          return (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={() => onQuestionClick(suggestion.text)}
              className={cn(
                'transition-all duration-200 border',
                colorClass,
                'hover:scale-105 active:scale-95'
              )}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {suggestion.text}
            </Button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-muted-foreground">
          Showing default suggestions
        </p>
      )}
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Eye, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

interface SimpleEnhancedMindMapProps {
  title: string;
  summary: string;
  detailedSummary?: string;
  keyTopics: string[];
  visualInsights: string[];
  timestampHighlights: Array<{
    timestamp: number;
    description: string;
    importance_score: number;
    learning_value?: string;
  }>;
  processingMethod: 'multimodal' | 'fallback';
  mindMapStructure?: {
    root: string;
    nodes: Array<{
      title: string;
      children: Array<{
        title: string;
        children: Array<any>;
      }>;
    }>;
  };
  learningObjectives?: string[];
  keyConceptsDetailed?: string[];
  terminologies?: string[];
}

export function SimpleEnhancedMindMap({
  title,
  summary,
  detailedSummary,
  keyTopics,
  visualInsights,
  timestampHighlights,
  processingMethod,
  mindMapStructure,
  learningObjectives,
  keyConceptsDetailed,
  terminologies
}: SimpleEnhancedMindMapProps) {
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const topicColors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-teal-100 text-teal-800 border-teal-200',
  ];

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-6 w-6 text-primary" />
            {title}
            <Badge variant={processingMethod === 'multimodal' ? 'default' : 'secondary'} className="text-xs">
              {processingMethod === 'multimodal' ? 'AI Enhanced' : 'Smart Analysis'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none"
            style={{ whiteSpace: 'pre-line' }}
          >
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
          
          {/* Detailed Summary Expandable Section */}
          {detailedSummary && detailedSummary !== summary && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                View Detailed Analysis (500+ words)
              </summary>
              <div className="mt-3 p-4 bg-background/60 rounded-lg border">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {detailedSummary.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {paragraph.startsWith('##') ? (
                        <strong className="text-foreground text-base">{paragraph.replace('##', '').trim()}</strong>
                      ) : paragraph.startsWith('###') ? (
                        <strong className="text-foreground">{paragraph.replace('###', '').trim()}</strong>
                      ) : (
                        paragraph
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      {learningObjectives && learningObjectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {learningObjectives.map((objective, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-amber-900 font-medium">{objective}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Mind Map Structure */}
      {mindMapStructure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-purple-600" />
              {mindMapStructure.root || "Python Learning Structure"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Root Topic */}
              <div className="text-center">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-200 rounded-xl">
                  <h3 className="font-bold text-purple-900 text-lg">{mindMapStructure.root}</h3>
                </div>
              </div>
              
              {/* Mind Map Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mindMapStructure.nodes.map((node, nodeIndex) => (
                  <div key={nodeIndex} className="space-y-2">
                    <div className="text-center">
                      <div className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-100 to-blue-100 border border-indigo-200 rounded-lg">
                        <h4 className="font-semibold text-indigo-900">{node.title}</h4>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {node.children.map((child, childIndex) => (
                        <Badge
                          key={childIndex}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          {child.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mind Map Layout (REMOVING Key Topics and Visual Insights from here) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Key Topics - REMOVED */}

        {/* Visual Insights - REMOVED */}

      </div>

      {/* Key Concepts and Terminologies */}
      {(keyConceptsDetailed && keyConceptsDetailed.length > 0) || (terminologies && terminologies.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Concepts */}
          {keyConceptsDetailed && keyConceptsDetailed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-5 w-5 text-emerald-600" />
                  Key Concepts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {keyConceptsDetailed.map((concept, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-emerald-50 border border-emerald-100"
                    >
                      <p className="text-sm text-emerald-900 font-medium">{concept}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terminologies */}
          {terminologies && terminologies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-rose-600" />
                  Key Terminology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {terminologies.map((term, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-rose-50 border border-rose-100"
                    >
                      <p className="text-xs text-rose-900">{term}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Key Moments Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-green-600" />
            Key Learning Moments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timestampHighlights.slice(0, 5).map((highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 font-mono text-xs">
                    {formatTime(highlight.timestamp)}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 group-hover:text-green-700">
                    {highlight.description}
                  </p>
                  {highlight.learning_value && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs mt-1",
                        highlight.learning_value === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      )}
                    >
                      {highlight.learning_value} value
                    </Badge>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="flex">
                    {Array.from({ length: Math.round(highlight.importance_score * 5) }).map((_, i) => (
                      <Sparkles key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
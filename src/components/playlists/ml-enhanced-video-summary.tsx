'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Eye, Mic, Sparkles, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { enhanceVideoWithMultiModalAnalysis } from '@/services/multimodal-summarizer';
import { SimpleEnhancedMindMap } from './simple-enhanced-mind-map';
import type { Video } from '@/types';

interface MLEnhancedVideoSummaryProps {
  video: Video;
  onEnhancedSummaryGenerated?: (enhancedSummary: string, multiModalData: any) => void;
}

interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'transcribing' | 'analyzing_visuals' | 'aligning' | 'summarizing' | 'completed' | 'error';
  progress: number;
  message: string;
}

export function MLEnhancedVideoSummary({ video, onEnhancedSummaryGenerated }: MLEnhancedVideoSummaryProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to process'
  });
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartProcessing = async () => {
    if (!video.youtubeURL || !video.id) {
      setError('Video URL or ID is missing');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus({
      stage: 'downloading',
      progress: 10,
      message: 'Downloading video and extracting audio...'
    });

    try {
      // Simulate processing stages with status updates
      const stages = [
        { stage: 'downloading', progress: 10, message: 'Downloading video and extracting audio...' },
        { stage: 'transcribing', progress: 30, message: 'Transcribing audio with Whisper AI...' },
        { stage: 'analyzing_visuals', progress: 50, message: 'Analyzing visual content with CLIP...' },
        { stage: 'aligning', progress: 70, message: 'Aligning audio and visual elements...' },
        { stage: 'summarizing', progress: 90, message: 'Generating enhanced summary with FLAN-T5...' },
      ];

      // Update status through stages
      for (const stage of stages) {
        setProcessingStatus(stage as ProcessingStatus);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
      }

      // Call the actual ML processing
      const result = await enhanceVideoWithMultiModalAnalysis(
        video.id,
        video.youtubeURL,
        video.summary
      );

      setProcessingStatus({
        stage: 'completed',
        progress: 100,
        message: 'Processing completed successfully!'
      });

      setEnhancedData(result);
      onEnhancedSummaryGenerated?.(result.enhanced_summary, result.multimodal_data);

    } catch (err) {
      console.error('Error processing video:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: 'Processing failed'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'downloading': return <Clock className="h-4 w-4" />;
      case 'transcribing': return <Mic className="h-4 w-4" />;
      case 'analyzing_visuals': return <Eye className="h-4 w-4" />;
      case 'aligning': return <TrendingUp className="h-4 w-4" />;
      case 'summarizing': return <Brain className="h-4 w-4" />;
      case 'completed': return <Sparkles className="h-4 w-4" />;
      case 'error': return <Sparkles className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'idle': return 'text-gray-600 bg-gray-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Multi-Modal AI Analysis
            {enhancedData?.processing_method === 'multimodal' && (
              <Badge variant="secondary" className="text-xs">ML Enhanced</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isProcessing && !enhancedData && (
            <div className="text-center py-6">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Use advanced AI models to analyze this video's audio and visual content
              </p>
              <Button onClick={handleStartProcessing} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Start AI Analysis
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  getStageColor(processingStatus.stage)
                )}>
                  {processingStatus.stage === 'error' ? 
                    getStageIcon(processingStatus.stage) : 
                    isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : getStageIcon(processingStatus.stage)
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{processingStatus.message}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${processingStatus.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{processingStatus.progress}%</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleStartProcessing}
              >
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Mind Map - Clean, All-in-One Display */}
      {enhancedData && (
        <SimpleEnhancedMindMap
          title={video.title || 'Video Analysis'}
          summary={enhancedData.enhanced_summary}
          detailedSummary={enhancedData.multimodal_data?.detailed_summary}
          keyTopics={enhancedData.multimodal_data?.key_topics || []}
          visualInsights={enhancedData.multimodal_data?.visual_insights || []}
          timestampHighlights={enhancedData.multimodal_data?.timestamp_highlights || []}
          processingMethod={enhancedData.processing_method}
          mindMapStructure={enhancedData.multimodal_data?.mind_map_structure}
          learningObjectives={enhancedData.multimodal_data?.learning_objectives}
          keyConceptsDetailed={enhancedData.multimodal_data?.key_concepts}
          terminologies={enhancedData.multimodal_data?.terminologies}
        />
      )}
    </div>
  );
} 
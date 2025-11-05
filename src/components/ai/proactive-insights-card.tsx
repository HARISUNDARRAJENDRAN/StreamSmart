"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  Clock,
  BookOpen,
  Lightbulb,
  MessageSquare,
  Play,
  ChevronRight,
  Loader2
} from 'lucide-react'

interface KeyMoment {
  timestamp: string
  category: 'definition' | 'example' | 'insight' | 'summary' | 'question' | 'visual'
  title: string
  description: string
  importance: number
  video_id: string
}

interface ProactiveInsights {
  video_id: string
  title: string
  summary: {
    summaries: {
      tldr?: string
      medium?: string
      detailed?: string
    }
  }
  key_moments: KeyMoment[]
  stats: {
    word_count: number
    estimated_duration_minutes: number
    total_key_moments: number
  }
  quick_questions: string[]
  generated_at: string
}

interface ProactiveInsightsCardProps {
  videoId: string
  transcript: string
  title: string
  userId?: string
  onQuestionClick?: (question: string) => void
  onTimestampClick?: (videoId: string, timestamp: string) => void
}

export function ProactiveInsightsCard({
  videoId,
  transcript,
  title,
  userId,
  onQuestionClick,
  onTimestampClick
}: ProactiveInsightsCardProps) {
  const [insights, setInsights] = useState<ProactiveInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSummaryLevel, setSelectedSummaryLevel] = useState<'tldr' | 'medium' | 'detailed'>('medium')

  useEffect(() => {
    generateInsights()
  }, [videoId])

  const generateInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('http://localhost:8000/auto-summary/proactive-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_id: videoId,
          transcript: transcript,
          title: title,
          user_id: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json()
      setInsights(data)
    } catch (err) {
      console.error('Error generating insights:', err)
      setError('Unable to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'definition':
        return '📚'
      case 'example':
        return '💡'
      case 'insight':
        return '✨'
      case 'summary':
        return '📝'
      case 'question':
        return '❓'
      case 'visual':
        return '🎨'
      default:
        return '📌'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'definition':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'example':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'insight':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'summary':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'question':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'visual':
        return 'bg-pink-100 text-pink-800 border-pink-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number)
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1] // mm:ss
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2] // hh:mm:ss
    }
    return 0
  }

  if (loading) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Generating AI insights...</p>
              <p className="text-sm text-gray-500 mt-1">This will only take a moment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !insights) {
    return (
      <Card className="border-2 border-red-200">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || 'Failed to load insights'}</p>
            <Button onClick={generateInsights} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-2xl">AI-Powered Insights</CardTitle>
        </div>
        <CardDescription>
          Proactive analysis generated for this video
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
          <div className="text-center">
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{insights.stats.estimated_duration_minutes}</p>
            <p className="text-xs text-gray-600">minutes</p>
          </div>
          <div className="text-center">
            <BookOpen className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{insights.stats.total_key_moments}</p>
            <p className="text-xs text-gray-600">key moments</p>
          </div>
          <div className="text-center">
            <Lightbulb className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{insights.quick_questions.length}</p>
            <p className="text-xs text-gray-600">suggested questions</p>
          </div>
        </div>

        <Tabs value={selectedSummaryLevel} onValueChange={(value: any) => setSelectedSummaryLevel(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tldr">TL;DR</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
          </TabsList>

          <TabsContent value="tldr" className="mt-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Quick Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {insights.summary.summaries.tldr || 'No TL;DR available'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medium" className="mt-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Balanced Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {insights.summary.summaries.medium || 'No medium summary available'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="mt-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Comprehensive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {insights.summary.summaries.detailed || 'No detailed summary available'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Key Moments Timeline */}
        {insights.key_moments.length > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="h-5 w-5" />
                Key Moments
              </CardTitle>
              <CardDescription>
                Jump to important parts of the video
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.key_moments.map((moment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => onTimestampClick?.(videoId, moment.timestamp)}
                  >
                    <div className="text-2xl">{getCategoryIcon(moment.category)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {moment.timestamp}
                        </span>
                        <Badge variant="outline" className={getCategoryColor(moment.category)}>
                          {moment.category}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {moment.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{moment.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Start Questions */}
        {insights.quick_questions.length > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Quick Start Questions
              </CardTitle>
              <CardDescription>
                Click to ask these questions instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.quick_questions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => onQuestionClick?.(question)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="flex-1">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-gray-500 text-center">
          Insights generated by AI • {new Date(insights.generated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}

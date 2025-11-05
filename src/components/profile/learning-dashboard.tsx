"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Flame,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react'

interface LearningProfile {
  overall_progress: number
  mastered_topics: string[]
  weak_areas: Array<{
    topic: string
    proficiency: number
    weakness_score: number
    severity: 'critical' | 'important' | 'minor'
    questions_asked: number
    days_since_practice: number
  }>
  topics_explored: number
  total_questions: number
  videos_watched: number
  current_streak: number
  education_level: string
  learning_velocity: number
  topic_proficiencies: Record<string, number>
}

interface Recommendation {
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  topic?: string
  icon: string
}

interface LearningDashboardProps {
  userId: string
  onTopicClick?: (topic: string) => void
  onReviewClick?: (topic: string) => void
}

export function LearningDashboard({ userId, onTopicClick, onReviewClick }: LearningDashboardProps) {
  const [profile, setProfile] = useState<LearningProfile | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchRecommendations()
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/learning-profile/${userId}/progress`)
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`http://localhost:8000/learning-profile/${userId}/recommendations`)
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchProfile(), fetchRecommendations()])
    setRefreshing(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'important':
        return 'bg-orange-500'
      case 'minor':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No learning data available yet. Start asking questions to build your profile!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Learning Journey</h2>
          <p className="text-gray-600 mt-1">Track your progress and get personalized recommendations</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-blue-600">{profile.overall_progress.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={profile.overall_progress} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Streak</p>
                <p className="text-2xl font-bold text-orange-600">{profile.current_streak} days</p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Keep it going! 🔥</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Topics Mastered</p>
                <p className="text-2xl font-bold text-green-600">{profile.mastered_topics.length}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{profile.topics_explored} explored</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Questions Asked</p>
                <p className="text-2xl font-bold text-purple-600">{profile.total_questions}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{profile.videos_watched} videos watched</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="weak-areas">Weak Areas</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Learning Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Education Level</p>
                  <Badge variant="outline" className="mt-1">
                    {profile.education_level.charAt(0).toUpperCase() + profile.education_level.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Learning Velocity</p>
                  <p className="text-lg font-semibold">{profile.learning_velocity.toFixed(2)} concepts/hr</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Recent Activity</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Questions this session</span>
                    <span className="font-medium">{profile.total_questions % 10 || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Topics explored</span>
                    <span className="font-medium">{profile.topics_explored}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mastered Topics */}
          {profile.mastered_topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Mastered Topics
                </CardTitle>
                <CardDescription>
                  You've achieved proficiency in these areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.mastered_topics.map((topic, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100"
                      onClick={() => onTopicClick?.(topic)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Proficiencies</CardTitle>
              <CardDescription>
                Your skill level across different topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(profile.topic_proficiencies).map(([topic, proficiency]) => (
                  <div key={topic} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{topic}</span>
                      <span className="text-sm text-gray-600">{proficiency.toFixed(1)}%</span>
                    </div>
                    <Progress value={proficiency} className="h-2" />
                  </div>
                ))}
                {Object.keys(profile.topic_proficiencies).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Start asking questions to track your topic proficiencies
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weak Areas Tab */}
        <TabsContent value="weak-areas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Areas Needing Attention
              </CardTitle>
              <CardDescription>
                Focus on these topics to strengthen your understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.weak_areas.length > 0 ? (
                <div className="space-y-4">
                  {profile.weak_areas.map((area, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{area.topic}</h4>
                            <Badge
                              variant="outline"
                              className={getSeverityColor(area.severity) + ' text-white border-0'}
                            >
                              {area.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Proficiency: {area.proficiency.toFixed(1)}%</span>
                            <span>•</span>
                            <span>{area.questions_asked} questions asked</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {area.days_since_practice} days ago
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReviewClick?.(area.topic)}
                          className="gap-1"
                        >
                          Review
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      <Progress value={area.proficiency} className="h-2 mt-3" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Great job! No weak areas detected. Keep up the good work! 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Recommendations</CardTitle>
              <CardDescription>
                AI-powered suggestions to optimize your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{rec.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <Badge
                              variant="outline"
                              className={getPriorityBadgeColor(rec.priority)}
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          {rec.topic && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onTopicClick?.(rec.topic!)}
                              className="gap-1"
                            >
                              {rec.action === 'review' ? 'Start Review' : 'Explore'}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No recommendations yet. Keep learning to get personalized suggestions!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

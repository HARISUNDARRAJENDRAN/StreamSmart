'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookOpen, Download, Lightbulb, RefreshCw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface StudyPlanViewerProps {
  playlistId: string;
  videoTitles: string[];
  playlistTitle?: string;
}

export function StudyPlanViewer({
  playlistId,
  videoTitles,
  playlistTitle
}: StudyPlanViewerProps) {
  const [studyPlan, setStudyPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);

  const generateStudyPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[StudyPlan] Generating study plan...', {
        playlistId,
        videoCount: videoTitles.length,
        hasGoal: !!userGoal
      });

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      console.log('[StudyPlan] Backend URL:', backendUrl);

      const requestBody = {
        playlist_id: playlistId,
        video_titles: videoTitles,
        user_goal: userGoal || null
      };
      console.log('[StudyPlan] Request body:', requestBody);

      const response = await fetch(`${backendUrl}/generate-study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('[StudyPlan] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudyPlan] Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.detail || errorData.message || 'Failed to generate study plan');
      }

      const data = await response.json();
      console.log('[StudyPlan] Success! Plan length:', data.studyPlanMarkdown?.length);
      
      setStudyPlan(data.studyPlanMarkdown);
      setShowGoalInput(false);

      // Analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('study_plan_generated', {
          playlistId,
          videoCount: videoTitles.length,
          hasGoal: !!userGoal,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('[StudyPlan] Error generating study plan:', err);
      setError(err.message || 'Failed to generate study plan. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPlan = () => {
    if (!studyPlan) return;

    const blob = new Blob([studyPlan], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-plan-${playlistTitle || playlistId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('study_plan_downloaded', {
        playlistId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const resetPlan = () => {
    setStudyPlan(null);
    setError(null);
    setUserGoal('');
    setShowGoalInput(false);
  };

  return (
    <Card className="w-full bg-white rounded-[24px] border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <CardHeader className="border-b border-black/5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-t-[24px]">
        <CardTitle className="flex items-center gap-3 text-black">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-2xl">Your Personalized Study Plan</span>
        </CardTitle>
        <CardDescription className="text-black/60 text-base">
          AI-generated learning path optimized for this playlist
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <AnimatePresence mode="wait">
          {!studyPlan && !loading && !error && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 rounded-[20px] border border-emerald-100/50">
                <h4 className="font-semibold text-black flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-emerald-600" />
                  What you'll get:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-emerald-600 font-bold">1</span>
                    </div>
                    <span className="text-sm text-black/80 font-medium">Optimal video watching sequence</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-emerald-600 font-bold">2</span>
                    </div>
                    <span className="text-sm text-black/80 font-medium">Prerequisites and learning objectives</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-emerald-600 font-bold">3</span>
                    </div>
                    <span className="text-sm text-black/80 font-medium">Study tips and practice suggestions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-emerald-600 font-bold">4</span>
                    </div>
                    <span className="text-sm text-black/80 font-medium">Realistic timeline estimates</span>
                  </div>
                </div>
              </div>

              {!showGoalInput ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={generateStudyPlan} 
                    size="lg" 
                    className="gap-2 flex-1 bg-black hover:bg-black/90 text-white rounded-full py-6 text-base font-medium shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  >
                    <BookOpen className="h-5 w-5" />
                    Generate Study Plan
                  </Button>
                  <Button
                    onClick={() => setShowGoalInput(true)}
                    variant="outline"
                    size="lg"
                    className="gap-2 rounded-full border-black/20 hover:bg-black/5 font-medium"
                  >
                    <Target className="h-4 w-4" />
                    Add Your Goal
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label htmlFor="user-goal" className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      What's your learning goal? (Optional)
                    </Label>
                    <Input
                      id="user-goal"
                      placeholder="E.g., 'Become a Python developer' or 'Build a web app'"
                      value={userGoal}
                      onChange={(e) => setUserGoal(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateStudyPlan} size="lg" className="gap-2 flex-1">
                      <BookOpen className="h-4 w-4" />
                      Generate with Goal
                    </Button>
                    <Button onClick={() => setShowGoalInput(false)} variant="outline" size="lg">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Takes about 5-10 seconds • {videoTitles.length} videos analyzed
              </p>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Creating your personalized study plan...</p>
                <p className="text-xs text-muted-foreground">
                  Analyzing {videoTitles.length} videos and optimizing learning path
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="text-destructive text-center space-y-2">
                <p className="font-medium">Oops! Something went wrong</p>
                <p className="text-sm">{error}</p>
              </div>
              <Button onClick={generateStudyPlan} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </motion.div>
          )}

          {studyPlan && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Actions Bar */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{videoTitles.length} videos • Personalized for you</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadPlan} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={resetPlan} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    New Plan
                  </Button>
                </div>
              </div>

              {/* Study Plan Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-3" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-3" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    code: ({ node, ...props }) => (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto" {...props} />
                    ),
                  }}
                >
                  {studyPlan}
                </ReactMarkdown>
              </div>

              {/* Feedback Section */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Was this study plan helpful?{' '}
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).analytics) {
                        (window as any).analytics.track('study_plan_feedback', {
                          playlistId,
                          helpful: true,
                          timestamp: new Date().toISOString()
                        });
                      }
                      alert('Thank you for your feedback!');
                    }}
                    className="text-primary hover:underline"
                  >
                    👍 Yes
                  </button>{' '}
                  /{' '}
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).analytics) {
                        (window as any).analytics.track('study_plan_feedback', {
                          playlistId,
                          helpful: false,
                          timestamp: new Date().toISOString()
                        });
                      }
                      alert('Thank you for your feedback! We\'ll work on improving it.');
                    }}
                    className="text-primary hover:underline"
                  >
                    👎 No
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

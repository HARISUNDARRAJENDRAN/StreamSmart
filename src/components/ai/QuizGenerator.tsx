'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizQuestion {
  questionId: string;
  questionText: string;
  options: Array<{
    optionId: string;
    text: string;
  }>;
  correctOptionId: string;
  explanation: string;
}

interface Quiz {
  quizTitle: string;
  questions: QuizQuestion[];
}

interface QuizGeneratorProps {
  videoId: string;
  numQuestions?: number;
}

export function QuizGenerator({ videoId, numQuestions = 5 }: QuizGeneratorProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setUserAnswers({});
    setSubmitted(false);

    try {
      console.log('[QuizGenerator] Generating quiz for video ID:', videoId);
      console.log('[QuizGenerator] Video ID length:', videoId?.length);
      console.log('[QuizGenerator] Video ID type:', typeof videoId);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          num_questions: numQuestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate quiz');
      }

      const data = await response.json();
      setQuiz(data.quiz);
      
      // Analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('quiz_generated', {
          videoId,
          numQuestions,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Failed to generate quiz:', err);
      setError(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const submitQuiz = () => {
    if (!quiz) return;

    // Calculate score
    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (userAnswers[q.questionId] === q.correctOptionId) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    // Analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('quiz_completed', {
        videoId,
        score: correctCount,
        totalQuestions: quiz.questions.length,
        percentage: Math.round((correctCount / quiz.questions.length) * 100),
        timestamp: new Date().toISOString()
      });
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Generated Quiz
        </CardTitle>
        <CardDescription>
          Test your knowledge of this video content with an AI-powered quiz
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!quiz && !loading && !error && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <p className="text-center text-muted-foreground mb-4">
                Generate a personalized quiz based on this video's content. Perfect for studying and retention!
              </p>
              <Button onClick={generateQuiz} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate {numQuestions}-Question Quiz
              </Button>
              <p className="text-xs text-muted-foreground">
                Takes about 5-10 seconds • Powered by AI
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
              <p className="text-sm text-muted-foreground">
                Analyzing video content and generating questions...
              </p>
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
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button onClick={generateQuiz} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </motion.div>
          )}

          {quiz && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Quiz Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{quiz.quizTitle}</h3>
                {submitted && (
                  <Badge variant={score >= quiz.questions.length * 0.7 ? 'default' : 'secondary'} className="text-lg">
                    Score: {score}/{quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
                  </Badge>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {quiz.questions.map((question, index) => {
                  const userAnswer = userAnswers[question.questionId];
                  const isCorrect = userAnswer === question.correctOptionId;

                  return (
                    <Card key={question.questionId} className={submitted ? (isCorrect ? 'border-green-500/50' : 'border-red-500/50') : ''}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* Question */}
                          <div className="flex items-start gap-3">
                            <Badge variant="outline">{index + 1}</Badge>
                            <h4 className="text-base font-medium flex-1">{question.questionText}</h4>
                            {submitted && (
                              isCorrect ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                              )
                            )}
                          </div>

                          {/* Options */}
                          <RadioGroup
                            value={userAnswer}
                            onValueChange={(value) => handleAnswerChange(question.questionId, value)}
                            disabled={submitted}
                            className="space-y-2"
                          >
                            {question.options.map((option) => {
                              const isSelected = userAnswer === option.optionId;
                              const isCorrectOption = option.optionId === question.correctOptionId;
                              const showAsCorrect = submitted && isCorrectOption;
                              const showAsWrong = submitted && isSelected && !isCorrect;

                              return (
                                <div
                                  key={option.optionId}
                                  className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                                    showAsCorrect ? 'bg-green-50 border-green-500' :
                                    showAsWrong ? 'bg-red-50 border-red-500' :
                                    isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                                  }`}
                                >
                                  <RadioGroupItem value={option.optionId} id={`${question.questionId}-${option.optionId}`} />
                                  <Label
                                    htmlFor={`${question.questionId}-${option.optionId}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    {option.optionId.toUpperCase()}) {option.text}
                                  </Label>
                                  {showAsCorrect && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                  {showAsWrong && (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                              );
                            })}
                          </RadioGroup>

                          {/* Explanation (shown after submission) */}
                          {submitted && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                            >
                              <p className="text-sm">
                                <strong className="text-blue-900 dark:text-blue-100">Explanation:</strong>{' '}
                                <span className="text-blue-800 dark:text-blue-200">{question.explanation}</span>
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                {!submitted ? (
                  <>
                    <Button variant="outline" onClick={resetQuiz}>
                      Cancel
                    </Button>
                    <Button
                      onClick={submitQuiz}
                      disabled={Object.keys(userAnswers).length !== quiz.questions.length}
                    >
                      Submit Quiz
                    </Button>
                  </>
                ) : (
                  <Button onClick={resetQuiz} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Take Another Quiz
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

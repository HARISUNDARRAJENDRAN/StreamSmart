'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Brain, RefreshCw, Lightbulb } from 'lucide-react';
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
    <Card className="w-full bg-white rounded-[24px] border border-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <CardHeader className="border-b border-black/5 bg-gradient-to-r from-purple-50 to-pink-50/50 rounded-t-[24px]">
        <CardTitle className="flex items-center gap-3 text-black">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-2xl">AI-Generated Quiz</span>
        </CardTitle>
        <CardDescription className="text-black/60 text-base">
          Test your knowledge of this video content with an AI-powered quiz
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <AnimatePresence mode="wait">
          {!quiz && !loading && !error && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 py-12"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-2">
                <Brain className="h-10 w-10 text-purple-600" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-xl font-semibold text-black">Ready to Test Your Knowledge?</h3>
                <p className="text-black/60">
                  Generate a personalized quiz based on this video's content. Perfect for studying and retention!
                </p>
              </div>
              <Button 
                onClick={generateQuiz} 
                size="lg" 
                className="gap-2 bg-black hover:bg-black/90 text-white rounded-full px-8 py-6 text-base font-medium shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all"
              >
                <Brain className="h-5 w-5" />
                Generate {numQuestions}-Question Quiz
              </Button>
              <div className="flex items-center gap-2 text-sm text-black/50">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span>Takes about 5-10 seconds • Powered by AI</span>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 py-16"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
                <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-medium text-black">
                  Analyzing video content...
                </p>
                <p className="text-sm text-black/60">
                  Generating intelligent questions just for you
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h3 className="text-2xl font-bold text-black">{quiz.quizTitle}</h3>
                {submitted && (
                  <div className={`px-6 py-3 rounded-full font-semibold text-lg shadow-lg ${
                    score >= quiz.questions.length * 0.7 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}>
                    Score: {score}/{quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {quiz.questions.map((question, index) => {
                  const userAnswer = userAnswers[question.questionId];
                  const isCorrect = userAnswer === question.correctOptionId;

                  return (
                    <Card key={question.questionId} className={`bg-white rounded-[20px] border-2 transition-all ${
                      submitted 
                        ? (isCorrect ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]') 
                        : 'border-black/5 hover:border-black/10'
                    }`}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* Question */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm shrink-0">
                              {index + 1}
                            </div>
                            <h4 className="text-lg font-semibold flex-1 text-black leading-relaxed">{question.questionText}</h4>
                            {submitted && (
                              isCorrect ? (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="h-5 w-5 text-white" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                  <XCircle className="h-5 w-5 text-white" />
                                </div>
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
                                  className={`flex items-center space-x-3 p-4 rounded-[16px] border-2 transition-all ${
                                    showAsCorrect ? 'bg-gradient-to-r from-green-50 to-emerald-50/50 border-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.15)]' :
                                    showAsWrong ? 'bg-gradient-to-r from-red-50 to-rose-50/50 border-red-500 shadow-[0_2px_8px_rgba(239,68,68,0.15)]' :
                                    isSelected ? 'bg-black/5 border-black/20' : 'border-black/10 hover:bg-black/[0.02] hover:border-black/20'
                                  }`}
                                >
                                  <RadioGroupItem value={option.optionId} id={`${question.questionId}-${option.optionId}`} className="shrink-0" />
                                  <Label
                                    htmlFor={`${question.questionId}-${option.optionId}`}
                                    className="flex-1 cursor-pointer text-black/90 font-medium"
                                  >
                                    <span className="font-bold text-black">{option.optionId.toUpperCase()})</span> {option.text}
                                  </Label>
                                  {showAsCorrect && (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                  )}
                                  {showAsWrong && (
                                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
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
                              className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-[16px] border border-blue-200/50"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <Lightbulb className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-blue-900 text-sm mb-1">Explanation</p>
                                  <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                {!submitted ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={resetQuiz}
                      className="rounded-full border-black/20 hover:bg-black/5 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitQuiz}
                      disabled={Object.keys(userAnswers).length !== quiz.questions.length}
                      className="rounded-full bg-black hover:bg-black/90 text-white font-medium px-8 disabled:opacity-50 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    >
                      Submit Quiz
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={resetQuiz} 
                    className="gap-2 rounded-full bg-black hover:bg-black/90 text-white font-medium px-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  >
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

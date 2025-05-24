'use client';

import type { Quiz, QuizQuestion } from '@/types';
import { generatePlaylistQuiz, type GeneratePlaylistQuizInput } from '@/ai/flows/generate-playlist-quiz-flow';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2Icon, LightbulbIcon, CircleCheck, XCircleIcon, RefreshCwIcon, ArrowLeftIcon, ArrowRightIcon, SettingsIcon, PlayIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PlaylistQuizProps {
  playlistId: string;
  playlistTitle: string;
  playlistContent: string;
}

type QuizDifficulty = 'easy' | 'medium' | 'hard';

export function PlaylistQuiz({ playlistId, playlistTitle, playlistContent }: PlaylistQuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: number }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [showSettings, setShowSettings] = useState(true);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');

  const handleFetchQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setQuiz(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setShowSettings(false); // Move to quiz view once generation starts

    try {
      const input: GeneratePlaylistQuizInput = {
        playlistTitle: playlistTitle,
        playlistContent: playlistContent,
        numQuestions: numQuestions,
        difficulty: difficulty,
      };
      const result = await generatePlaylistQuiz(input);
      if (result && result.questions.length > 0) {
        setQuiz(result);
      } else {
        setError('The AI could not generate a quiz for this playlist with the current settings. There might not be enough content, or the content is too abstract. Try different settings or a different playlist.');
        setQuiz({ title: `Quiz: ${playlistTitle}`, questions: [] }); 
        setShowSettings(true); // Go back to settings on error
      }
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      setError(`Failed to generate quiz: ${err.message || 'Unknown error'}`);
      toast({
        title: "Quiz Generation Error",
        description: `Could not create a quiz. ${err.message || 'Please try again.'}`,
        variant: "destructive",
      });
      setShowSettings(true); // Go back to settings on error
    } finally {
      setIsLoading(false);
    }
  };

  // Initial effect to ensure settings are shown if no quiz is loaded
  useEffect(() => {
    if (!playlistContent) {
        setError("Playlist content is not available to generate a quiz.");
        setShowSettings(true);
    } else if (!quiz && !isLoading && !error) {
        setShowSettings(true); // Default to showing settings if no quiz is loaded and not currently loading/error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistContent]);


  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
     toast({
      title: "Quiz Submitted!",
      description: "Check out your results below.",
    });
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 10) {
      setNumQuestions(value);
    } else if (e.target.value === '') {
      setNumQuestions(1); // Or some other default/handling for empty input
    }
  };
  
  const resetQuizAndShowSettings = () => {
    setQuiz(null);
    setError(null);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowSettings(true);
  };


  if (showSettings || isLoading && !quiz) {
    return (
      <Card className="w-full p-6 min-h-[400px] flex flex-col justify-center">
        <CardHeader>
          <CardTitle className="flex items-center"><SettingsIcon className="mr-2 h-6 w-6 text-primary"/>Quiz Settings</CardTitle>
          <CardDescription>Customize your quiz experience for "{playlistTitle}".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="numQuestions">Number of Questions (1-10)</Label>
            <Input
              id="numQuestions"
              type="number"
              min="1"
              max="10"
              value={numQuestions}
              onChange={handleNumQuestionsChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select
              value={difficulty}
              onValueChange={(value: string) => setDifficulty(value as QuizDifficulty)}
              disabled={isLoading}
            >
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="destructive">
              <XCircleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleFetchQuiz} disabled={isLoading || !playlistContent} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <PlayIcon className="mr-2 h-4 w-4" />}
            {isLoading ? 'Generating Quiz...' : 'Start Quiz'}
          </Button>
        </CardFooter>
      </Card>
    );
  }


  if (isLoading) { // This covers loading after settings are submitted
    return (
      <Card className="w-full min-h-[400px] flex flex-col items-center justify-center">
        <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating your quiz, please wait...</p>
      </Card>
    );
  }
  
  // This error handles errors AFTER attempting to fetch quiz (not initial config errors)
  if (error && !showSettings) { 
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircleIcon className="h-4 w-4" />
        <AlertTitle>Error Generating Quiz</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
         <Button onClick={resetQuizAndShowSettings} variant="outline" size="sm" className="mt-4">
          <RefreshCwIcon className="mr-2 h-4 w-4" /> Change Settings & Try Again
        </Button>
      </Alert>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
     return (
      <Card className="w-full min-h-[400px] flex flex-col items-center justify-center text-center p-6">
        <LightbulbIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="mb-2">No Quiz Available</CardTitle>
        <CardDescription>
          The AI couldn't create a quiz for this playlist with the selected settings. This can happen if there's not enough textual content or if the content is very abstract.
        </CardDescription>
        <Button onClick={resetQuizAndShowSettings} variant="outline" size="sm" className="mt-6">
          <RefreshCwIcon className="mr-2 h-4 w-4" /> Change Settings & Regenerate
        </Button>
      </Card>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (isSubmitted) {
    let score = 0;
    quiz.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });

    return (
      <Card className="w-full p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quiz Results for "{quiz.title}"</CardTitle>
          <CardDescription className="text-xl font-semibold text-primary">
            You scored: {score} out of {quiz.questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className={`p-4 rounded-lg border ${userAnswers[q.id] === q.correctAnswerIndex ? 'border-green-500 bg-green-500/10' : 'border-destructive bg-destructive/10'}`}>
              <p className="font-semibold mb-1">Question {index + 1}: {q.questionText}</p>
              <p className="text-sm">Your answer: <span className="font-medium">{q.options[userAnswers[q.id]] || "Not answered"}</span></p>
              <p className="text-sm">Correct answer: <span className="font-medium">{q.options[q.correctAnswerIndex]}</span></p>
              {userAnswers[q.id] !== q.correctAnswerIndex && q.explanation && (
                <p className="text-xs mt-1 pt-1 border-t border-muted-foreground/20 text-muted-foreground">Explanation: {q.explanation}</p>
              )}
              {userAnswers[q.id] === q.correctAnswerIndex && q.explanation && (
                 <p className="text-xs mt-1 pt-1 border-t border-muted-foreground/20 text-muted-foreground">Explanation: {q.explanation}</p>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          <Button onClick={resetQuizAndShowSettings} variant="default">
            <RefreshCwIcon className="mr-2 h-4 w-4" /> New Quiz (Change Settings)
          </Button>
           <Button onClick={handleFetchQuiz} variant="outline">
            <RefreshCwIcon className="mr-2 h-4 w-4" /> Retake Same Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full p-6">
      <CardHeader>
        <CardTitle>{quiz.title} ({difficulty}, {numQuestions} questions)</CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-semibold">{currentQuestion.questionText}</p>
        <RadioGroup
          value={userAnswers[currentQuestion.id]?.toString()}
          onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
          className="space-y-2"
        >
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:border-primary">
              <RadioGroupItem value={index.toString()} id={`${currentQuestion.id}-option-${index}`} />
              <Label htmlFor={`${currentQuestion.id}-option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between mt-6">
         <div>
            <Button onClick={resetQuizAndShowSettings} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <SettingsIcon className="mr-2 h-4 w-4"/> Change Settings
            </Button>
        </div>
        <div className="flex gap-2">
            <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            >
            <ArrowLeftIcon className="mr-2 h-4 w-4"/> Previous
            </Button>
            {currentQuestionIndex < quiz.questions.length - 1 ? (
            <Button onClick={handleNextQuestion} variant="outline">
                Next <ArrowRightIcon className="ml-2 h-4 w-4"/>
            </Button>
            ) : (
            <Button onClick={handleSubmitQuiz} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                <CircleCheck className="mr-2 h-4 w-4"/> Submit Quiz
            </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}


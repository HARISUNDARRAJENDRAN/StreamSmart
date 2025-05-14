
'use server';
/**
 * @fileOverview AI flow to generate a quiz based on playlist content.
 *
 * - generatePlaylistQuiz - A function that creates quiz questions from playlist text.
 * - GeneratePlaylistQuizInput - The input type.
 * - GeneratePlaylistQuizOutput - The return type (Quiz data).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Quiz, QuizQuestion } from '@/types'; // Assuming Quiz types are in src/types

const QuizQuestionSchema = z.object({
  id: z.string().describe('A unique identifier for this question (e.g., "q1", "q2").'),
  questionText: z.string().describe('The text of the multiple-choice question.'),
  options: z.array(z.string()).length(4).describe('An array of exactly four string options for the question.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The 0-based index of the correct answer in the options array.'),
  explanation: z.string().optional().describe('A brief explanation for why the correct answer is right, especially if the question is nuanced.'),
});

const GeneratePlaylistQuizInputSchema = z.object({
  playlistTitle: z.string().describe('The title of the playlist, to give context to the quiz.'),
  playlistContent: z.string().describe('The textual content of the playlist (e.g., concatenated titles, descriptions, summaries, or transcripts).'),
  numQuestions: z.number().min(1).max(10).default(5).describe('The desired number of questions for the quiz.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium').describe('The difficulty level of the quiz questions.'),
});
export type GeneratePlaylistQuizInput = z.infer<typeof GeneratePlaylistQuizInputSchema>;

const GeneratePlaylistQuizOutputSchema = z.object({
  title: z.string().describe('A suitable title for the generated quiz (e.g., "Quiz: [Playlist Title]").'),
  questions: z.array(QuizQuestionSchema).describe('An array of generated quiz questions.'),
});
export type GeneratePlaylistQuizOutput = z.infer<typeof GeneratePlaylistQuizOutputSchema>;


export async function generatePlaylistQuiz(input: GeneratePlaylistQuizInput): Promise<GeneratePlaylistQuizOutput> {
  return generatePlaylistQuizFlow(input);
}

const quizGenerationPrompt = ai.definePrompt({
  name: 'generatePlaylistQuizPrompt',
  input: {schema: GeneratePlaylistQuizInputSchema},
  output: {schema: GeneratePlaylistQuizOutputSchema},
  prompt: `
You are an AI expert specializing in creating educational quizzes from textual content.
Your task is to generate a multiple-choice quiz based on the provided playlist information and selected difficulty.

Playlist Title: {{{playlistTitle}}}
Content to Base Quiz On:
{{{playlistContent}}}
Difficulty Level: {{{difficulty}}}

Instructions:
1.  Analyze the 'Playlist Title' and 'Content to Base Quiz On' to understand the key topics and concepts.
2.  Generate exactly {{{numQuestions}}} unique multiple-choice questions.
3.  Adjust the complexity of questions based on the 'Difficulty Level':
    *   'easy': Focus on straightforward facts, definitions, and main ideas. Options should have one clearly correct answer and obvious distractors.
    *   'medium': Questions may require some interpretation, comparison, or connection of concepts. Distractors might be more plausible.
    *   'hard': Questions should involve deeper analysis, synthesis of information, application of knowledge, or nuanced distinctions. Distractors should be very plausible.
4.  For each question:
    a.  Formulate a clear and concise 'questionText' appropriate for the difficulty.
    b.  Provide exactly four 'options'. Three should be plausible distractors (matching difficulty), and one must be the correct answer.
    c.  Specify the 'correctAnswerIndex' (0-3) corresponding to the correct option.
    d.  Optionally, provide a brief 'explanation' for why the answer is correct, especially for complex or nuanced questions.
    e.  Ensure each question has a unique 'id' (e.g., "q1", "q2", ... "q{{{numQuestions}}}").
5.  The overall quiz should have a 'title', like "Quiz: {{{playlistTitle}}}".
6.  Ensure your output strictly follows the 'GeneratePlaylistQuizOutputSchema' JSON format.

Focus on creating questions that test important information and concepts presented in the content. Avoid overly trivial or obscure details unless they are central to the material.
Make sure distractors are believable but clearly incorrect based on the provided content and selected difficulty.
`,
});

const generatePlaylistQuizFlow = ai.defineFlow(
  {
    name: 'generatePlaylistQuizFlow',
    inputSchema: GeneratePlaylistQuizInputSchema,
    outputSchema: GeneratePlaylistQuizOutputSchema,
  },
  async (input: GeneratePlaylistQuizInput) => {
    const {output} = await quizGenerationPrompt(input);
    if (!output) {
        console.error('AI did not return an output for quiz generation.');
        return { title: `Quiz: ${input.playlistTitle} (Error)`, questions: [] };
    }
    return {
        title: output.title || `Quiz: ${input.playlistTitle}`,
        questions: Array.isArray(output.questions) ? output.questions : [],
    };
  }
);


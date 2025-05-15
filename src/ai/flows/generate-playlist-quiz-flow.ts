
'use server';
/**
 * @fileOverview AI flow to generate a quiz based on playlist content.
 *
 * - generatePlaylistQuiz - A function that creates quiz questions from playlist text.
 * - GeneratePlaylistQuizInput - The input type.
 * - GeneratePlaylistQuizOutput - The return type (Quiz data).
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';
import type { Quiz as AppQuiz, QuizQuestion as AppQuizQuestion } from '@/types'; // Renamed to avoid conflict

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096, 
  responseMimeType: "application/json",
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

async function runChat(promptParts: (string | { text: string } | { inlineData: { mimeType: string, data: string } })[], zodSchema: any) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env file.");
  }
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig,
    safetySettings
  });

  const fullPrompt = [
      ...promptParts,
      {text: "\n\nProduce JSON output that strictly adheres to the following Zod schema. Do not include any markdown formatting (e.g. ```json ... ```) around the JSON output:\n" + JSON.stringify(zodSchema, null, 2)}
  ];

  const result = await model.generateContent({ contents: [{ role: "user", parts: fullPrompt }] });
  try {
    const text = result.response.text();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI JSON output for generatePlaylistQuiz:", result.response.text(), e);
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}

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
  const zodJsonSchema = GeneratePlaylistQuizOutputSchema.openapi('GeneratePlaylistQuizOutput');

  const prompt = `
You are an AI expert specializing in creating educational quizzes from textual content.
Your task is to generate a multiple-choice quiz based on the provided playlist information, desired number of questions, and selected difficulty.

Playlist Title: "${input.playlistTitle}"
Content to Base Quiz On:
"""
${input.playlistContent}
"""
Number of Questions to Generate: ${input.numQuestions}
Difficulty Level: ${input.difficulty}

Instructions:
1.  Thoroughly analyze the 'Playlist Title' and 'Content to Base Quiz On' to understand the key topics, concepts, and information presented.
2.  Generate exactly ${input.numQuestions} unique multiple-choice questions that accurately test understanding of the provided content.
3.  Adjust the complexity of questions and the plausibility of distractors based on the 'Difficulty Level':
    *   'easy': Focus on straightforward facts, definitions, and main ideas directly stated in the content. Options should have one clearly correct answer and obvious distractors.
    *   'medium': Questions may require some interpretation, comparison, or connection of concepts from the content. Distractors should be plausible but incorrect.
    *   'hard': Questions should involve deeper analysis, synthesis of information from different parts of the content, application of knowledge, or nuanced distinctions. Distractors should be very plausible and subtle.
4.  For each question:
    a.  Formulate a clear and concise 'questionText' appropriate for the difficulty level and based on the content.
    b.  Provide exactly four 'options'. Three should be plausible distractors (matching the difficulty), and one must be the correct answer based on the content.
    c.  Specify the 'correctAnswerIndex' (0-3) corresponding to the correct option in the 'options' array.
    d.  Provide a brief 'explanation' for why the correct answer is right, especially for medium or hard questions, or if the concept is nuanced. This explanation should also be based on the provided content.
    e.  Ensure each question has a unique 'id' string (e.g., "q1", "q2", ... "q${input.numQuestions}").
5.  The overall quiz should have a 'title', like "Quiz: ${input.playlistTitle}".
6.  Ensure your entire output strictly follows the JSON format defined by the 'GeneratePlaylistQuizOutputSchema'.

Focus on creating high-quality questions that test important information and concepts presented in the content. Avoid overly trivial or obscure details unless they are central to the material.
Make sure distractors are believable but unambiguously incorrect based on the provided content and selected difficulty.
If the content is too short or unsuitable for generating the requested number of questions at the specified difficulty, generate as many high-quality questions as possible up to the requested number. If no questions can be generated, return an empty 'questions' array.
`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  const parsedOutput = GeneratePlaylistQuizOutputSchema.parse(aiOutput);

  if (!parsedOutput) {
      return { title: `Quiz: ${input.playlistTitle} (Error)`, questions: [] };
  }
  return {
      title: parsedOutput.title || `Quiz: ${input.playlistTitle}`,
      questions: Array.isArray(parsedOutput.questions) ? parsedOutput.questions : [],
  };
}

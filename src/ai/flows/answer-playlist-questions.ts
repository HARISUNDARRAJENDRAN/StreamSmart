
'use server';

/**
 * @fileOverview AI agent to answer user questions about a specific playlist using RAG.
 *
 * - answerPlaylistQuestion - A function that answers a user's question about a given playlist.
 * - AnswerPlaylistQuestionInput - The input type for the answerPlaylistQuestion function.
 * - AnswerPlaylistQuestionOutput - The return type for the answerPlaylistQuestion function.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
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

  const result = await model.generateContent({ contents: [{ role: "user", parts: fullPrompt }]});
  try {
    const text = result.response.text();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI JSON output for answerPlaylistQuestion:", result.response.text(), e);
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}

const AnswerPlaylistQuestionInputSchema = z.object({
  playlistContent: z
    .string()
    .describe('The entire content of the playlist, including video titles, descriptions, and transcripts.'),
  question: z.string().describe('The user question about the playlist content.'),
});
export type AnswerPlaylistQuestionInput = z.infer<
  typeof AnswerPlaylistQuestionInputSchema
>;

const AnswerPlaylistQuestionOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user question based on the playlist content or general knowledge.'),
});
export type AnswerPlaylistQuestionOutput = z.infer<
  typeof AnswerPlaylistQuestionOutputSchema
>;

export async function answerPlaylistQuestion(
  input: AnswerPlaylistQuestionInput
): Promise<AnswerPlaylistQuestionOutput> {
  const zodJsonSchema = AnswerPlaylistQuestionOutputSchema.openapi('AnswerPlaylistQuestionOutput');

  const prompt = `You are an AI assistant for YouTube playlists.
You have access to the following:
- Specific Playlist Content (video titles, descriptions, transcripts).
- Your general knowledge.

User's Question: ${input.question}

Playlist Content (use this as the primary source):
${input.playlistContent}

Please follow these steps to construct your answer:
1.  Carefully analyze the 'Playlist Content' to see if it directly answers the 'User's Question'.
2.  If a clear answer is found in the 'Playlist Content', provide a concise answer directly derived from it.
3.  If the 'Playlist Content' does NOT contain a direct answer, then use your 'General Knowledge' to answer the question. If you use general knowledge, YOU MUST explicitly state this by beginning your response with: "Based on my general knowledge,".
4.  If you cannot answer the question using either the 'Playlist Content' or your 'General Knowledge', then respond with: "I am unable to answer that question at this time."
5.  Ensure your final output is only the answer text.`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  return AnswerPlaylistQuestionOutputSchema.parse(aiOutput);
}

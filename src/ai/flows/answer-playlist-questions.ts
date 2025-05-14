
'use server';

/**
 * @fileOverview AI agent to answer user questions about a specific playlist using RAG.
 *
 * - answerPlaylistQuestion - A function that answers a user's question about a given playlist.
 * - AnswerPlaylistQuestionInput - The input type for the answerPlaylistQuestion function.
 * - AnswerPlaylistQuestionOutput - The return type for the answerPlaylistQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return answerPlaylistQuestionFlow(input);
}

const answerPlaylistQuestionPrompt = ai.definePrompt({
  name: 'answerPlaylistQuestionPrompt',
  input: {schema: AnswerPlaylistQuestionInputSchema},
  output: {schema: AnswerPlaylistQuestionOutputSchema},
  prompt: `You are an AI chatbot designed to help users with their YouTube playlists.
You will be provided with:
1. Playlist Content: This includes video titles, descriptions, and transcripts from the current playlist.
2. Question: The user's question.

Your primary goal is to answer the user's question based on the provided Playlist Content.
- Search the Playlist Content thoroughly for the answer.
- If you find the answer in the Playlist Content, provide it directly.

If the answer cannot be found in the Playlist Content:
- Attempt to answer the question using your general knowledge.
- If you use general knowledge, YOU MUST preface your answer with: "Based on my general knowledge,".
- Be concise and helpful.

If you cannot answer the question using either the Playlist Content or your general knowledge, respond with: "I am unable to answer that question at this time."

Playlist Content:
{{{playlistContent}}}

Question: {{{question}}}`,
});

const answerPlaylistQuestionFlow = ai.defineFlow(
  {
    name: 'answerPlaylistQuestionFlow',
    inputSchema: AnswerPlaylistQuestionInputSchema,
    outputSchema: AnswerPlaylistQuestionOutputSchema,
  },
  async input => {
    const {output} = await answerPlaylistQuestionPrompt(input);
    return output!;
  }
);

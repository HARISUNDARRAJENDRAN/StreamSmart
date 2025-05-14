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
    .describe('The AI-generated answer to the user question based on the playlist content.'),
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
  prompt: `You are an AI chatbot designed to answer questions about YouTube playlists.  You will be provided with the content of the playlist, which includes video titles, descriptions, and transcripts.  Use this information to answer the user's question as accurately and thoroughly as possible. If the answer is not available in the provided content, respond that you cannot answer the question.

Playlist Content: {{{playlistContent}}}

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

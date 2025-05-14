
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
  prompt: `You are an AI assistant for YouTube playlists.
You have access to the following:
- Specific Playlist Content (video titles, descriptions, transcripts).
- Your general knowledge.

User's Question: {{{question}}}

Playlist Content:
{{{playlistContent}}}

Please follow these steps to answer:
1.  First, check if the 'Playlist Content' directly answers the 'User's Question'. If it does, provide a concise answer from this content.
2.  If the 'Playlist Content' doesn't fully answer the question, use your 'General Knowledge'. If you use general knowledge, you MUST begin your response with "Based on my general knowledge,".
3.  If you cannot answer using either source, respond with: "I am unable to answer that question at this time."`,
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


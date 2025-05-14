
'use server';

/**
 * @fileOverview AI-powered YouTube video recommendation flow based on playlist content.
 *
 * - generateVideoRecommendations - A function that generates video recommendations.
 * - GenerateVideoRecommendationsInput - The input type for the generateVideoRecommendations function.
 * - GenerateVideoRecommendationsOutput - The return type for the generateVideoRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVideoRecommendationsInputSchema = z.object({
  playlistTitle: z.string().describe('The title of the playlist.'),
});

export type GenerateVideoRecommendationsInput = z.infer<typeof GenerateVideoRecommendationsInputSchema>;

const GenerateVideoRecommendationsOutputSchema = z.object({
  recommendedVideoTitles: z.array(z.string()).describe('Titles of recommended YouTube videos.'),
  reasoning: z.string().describe('The AI reasoning behind the video recommendations.'),
});

export type GenerateVideoRecommendationsOutput = z.infer<typeof GenerateVideoRecommendationsOutputSchema>;

export async function generateVideoRecommendations(input: GenerateVideoRecommendationsInput): Promise<GenerateVideoRecommendationsOutput> {
  return generateVideoRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVideoRecommendationsPrompt',
  input: {schema: GenerateVideoRecommendationsInputSchema},
  output: {schema: GenerateVideoRecommendationsOutputSchema},
  prompt: `You are an AI video recommendation expert.

  Based on the following playlist title, recommend a list of relevant YouTube videos.

  Playlist Title: {{{playlistTitle}}}

  Consider the playlist's topic based SOLELY on its title to identify suitable videos. Do NOT assume or use any other information like description or tags, as they are not provided.
  Provide a brief explanation of why each video is recommended based on the title.
  Format your response as a JSON object with 'recommendedVideoTitles' (an array of video titles) and 'reasoning' (your explanation for the recommendations).`,
});

const generateVideoRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateVideoRecommendationsFlow',
    inputSchema: GenerateVideoRecommendationsInputSchema,
    outputSchema: GenerateVideoRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


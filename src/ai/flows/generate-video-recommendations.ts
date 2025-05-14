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
  playlistDescription: z.string().describe('The description of the playlist.'),
  playlistTags: z.array(z.string()).describe('Tags associated with the playlist.'),
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

  Based on the following playlist information, recommend a list of relevant YouTube videos.

  Playlist Title: {{{playlistTitle}}}
  Playlist Description: {{{playlistDescription}}}
  Playlist Tags: {{#each playlistTags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Consider the playlist's topic, description, and tags to identify suitable videos.
  Provide a brief explanation of why each video is recommended.
  Format your response as a JSON object with 'recommendedVideoTitles' (an array of video titles) and 'reasoning' (your explanation).`,
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

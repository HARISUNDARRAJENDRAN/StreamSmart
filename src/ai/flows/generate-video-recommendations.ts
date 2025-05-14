
'use server';

/**
 * @fileOverview AI-powered YouTube video recommendation flow.
 * Uses a Genkit tool to search YouTube for videos based on the playlist title
 * and returns detailed video information.
 *
 * - generateVideoRecommendations - A function that generates video recommendations.
 * - GenerateVideoRecommendationsInput - The input type for the generateVideoRecommendations function.
 * - GenerateVideoRecommendationsOutput - The return type for the generateVideoRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchVideos } from '@/services/youtube'; // Import the new YouTube service
import type { Video } from '@/types'; // Import your main Video type

const GenerateVideoRecommendationsInputSchema = z.object({
  playlistTitle: z.string().describe('The title of the playlist.'),
});
export type GenerateVideoRecommendationsInput = z.infer<typeof GenerateVideoRecommendationsInputSchema>;

// Define a Zod schema that matches our Video type from src/types/index.ts
// This will be used for the tool's output and the flow's output.
const VideoSchema = z.object({
  id: z.string().describe("YouTube video ID."),
  title: z.string().describe("Title of the YouTube video."),
  youtubeURL: z.string().url().describe("Playable URL of the YouTube video."),
  thumbnail: z.string().url().describe("Thumbnail URL of the video."),
  duration: z.string().describe("Duration of the video (e.g., '5:30' or '1:02:03')."),
  summary: z.string().optional().describe("A brief summary or description of the video. This can be from YouTube or AI-generated reasoning for recommendation."),
  // addedBy, completionStatus, understandingScore are not strictly needed for recommendation output
  // but can be part of a more comprehensive Video type if desired.
});
export type RecommendedVideo = z.infer<typeof VideoSchema>;

const GenerateVideoRecommendationsOutputSchema = z.object({
  recommendedVideos: z.array(VideoSchema).describe('List of recommended YouTube videos with their details.'),
  // reasoning: z.string().optional().describe('Overall AI reasoning behind the video recommendations set (optional).'),
});
export type GenerateVideoRecommendationsOutput = z.infer<typeof GenerateVideoRecommendationsOutputSchema>;


// Define the Genkit tool for searching YouTube videos
const searchYouTubeVideosTool = ai.defineTool(
  {
    name: 'searchYouTubeVideosTool',
    description: 'Searches YouTube for videos based on a query string and returns a list of video details including title, URL, thumbnail, and duration.',
    inputSchema: z.object({
      query: z.string().describe('The search query for YouTube videos (e.g., "React tutorial for beginners").'),
      maxResults: z.number().optional().default(5).describe('Maximum number of video results to return.'),
    }),
    outputSchema: z.array(VideoSchema), // Tool outputs an array of our Video schema
  },
  async (input) => {
    console.log(`Tool 'searchYouTubeVideosTool' called with query: ${input.query}, maxResults: ${input.maxResults}`);
    // Call our YouTube service
    const videosFromService = await searchVideos(input.query, input.maxResults);
    
    // Map the service output to the VideoSchema.
    // The service already returns Partial<Video>, so we need to ensure it fits VideoSchema.
    // For now, let's assume searchVideos returns fields compatible with VideoSchema.
    // If not, proper mapping/validation would be needed here.
    // The service already returns what we need for the VideoSchema.
    return videosFromService.map(v => ({
        id: v.id || '', // Ensure all required fields are present
        title: v.title || 'Untitled Video',
        youtubeURL: v.youtubeURL || '',
        thumbnail: v.thumbnail || 'https://placehold.co/300x180.png', // Provide a fallback thumbnail
        duration: v.duration || 'N/A',
        summary: v.summary || undefined, // summary is optional
    })).filter(v => v.id && v.youtubeURL && v.thumbnail) as RecommendedVideo[]; // Basic filtering for valid entries
  }
);

// Define the prompt that uses the tool
const recommendationPrompt = ai.definePrompt({
  name: 'generateVideoRecommendationsPrompt',
  input: { schema: GenerateVideoRecommendationsInputSchema },
  output: { schema: GenerateVideoRecommendationsOutputSchema },
  tools: [searchYouTubeVideosTool], // Make the tool available to the LLM
  prompt: `You are an AI YouTube video recommendation expert.
Your goal is to recommend relevant YouTube videos based on a given playlist title.

Playlist Title: {{{playlistTitle}}}

Instructions:
1. Analyze the Playlist Title to understand its core subject and intent.
2. Formulate one or more concise and effective search queries based on this understanding.
3. Use the 'searchYouTubeVideosTool' to find videos matching your query. You can specify the number of results you want (e.g., 5-10 videos initially).
4. From the videos returned by the tool, select up to 3-5 of the most relevant and high-quality videos that would be excellent additions to a playlist with the given title.
5. For each selected video, if the tool provided a summary/description, use that. If not, or if you can provide a better concise reason for its inclusion based on its title and the playlist title, briefly state why this video is a good recommendation in its 'summary' field.
6. Ensure your final output strictly adheres to the 'GenerateVideoRecommendationsOutputSchema' JSON format, containing a list of 'recommendedVideos'. Each video should have an id, title, youtubeURL, thumbnail, duration, and an optional summary.
Do not include any videos if the tool returns no results or if you deem none of them suitable. In such a case, return an empty 'recommendedVideos' array.
Do not add any conversational text or explanations outside the JSON structure.
`,
});

const generateVideoRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateVideoRecommendationsFlow',
    inputSchema: GenerateVideoRecommendationsInputSchema,
    outputSchema: GenerateVideoRecommendationsOutputSchema,
  },
  async (input) => {
    console.log('Generating video recommendations for title:', input.playlistTitle);
    const { output } = await recommendationPrompt(input);

    if (!output) {
      console.error('AI did not return an output for video recommendations.');
      return { recommendedVideos: [] };
    }
    
    // Ensure output.recommendedVideos is an array, even if AI messes up.
    if (!Array.isArray(output.recommendedVideos)) {
        console.warn("AI output for recommendedVideos was not an array. Defaulting to empty.", output.recommendedVideos);
        output.recommendedVideos = [];
    }
    
    console.log('Received recommendations:', output.recommendedVideos);
    return output; // The LLM is expected to format according to GenerateVideoRecommendationsOutputSchema
  }
);

// Exported wrapper function
export async function generateVideoRecommendations(
  input: GenerateVideoRecommendationsInput
): Promise<GenerateVideoRecommendationsOutput> {
  return generateVideoRecommendationsFlow(input);
}

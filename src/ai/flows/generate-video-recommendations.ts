
'use server';

/**
 * @fileOverview AI-powered YouTube video recommendation.
 * Fetches videos using the YouTube service and then uses AI to select and summarize recommendations.
 *
 * - generateVideoRecommendations - A function that generates video recommendations.
 * - GenerateVideoRecommendationsInput - The input type.
 * - GenerateVideoRecommendationsOutput - The return type.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';
import { searchVideos } from '@/services/youtube';
import type { Video as AppVideo } from '@/types'; // Renamed to avoid conflict

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

  const result = await model.generateContent({ contents: [{ role: "user", parts: fullPrompt }] });
  try {
    const text = result.response.text();
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI JSON output for generateVideoRecommendations:", result.response.text(), e);
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}


const GenerateVideoRecommendationsInputSchema = z.object({
  playlistTitle: z.string().describe('The title of the playlist for which to recommend videos.'),
});
export type GenerateVideoRecommendationsInput = z.infer<typeof GenerateVideoRecommendationsInputSchema>;

const VideoSchema = z.object({
  id: z.string().describe("YouTube video ID."),
  title: z.string().describe("Title of the YouTube video."),
  youtubeURL: z.string().url().describe("Playable URL of the YouTube video."),
  thumbnail: z.string().url().describe("Thumbnail URL of the video."),
  duration: z.string().describe("Duration of the video (e.g., '5:30' or '1:02:03')."),
  summary: z.string().optional().describe("A brief AI-generated summary explaining the video's relevance to the playlist."),
});
export type RecommendedVideo = z.infer<typeof VideoSchema>;

const GenerateVideoRecommendationsOutputSchema = z.object({
  recommendedVideos: z.array(VideoSchema).describe('List of recommended YouTube videos with their details.'),
});
export type GenerateVideoRecommendationsOutput = z.infer<typeof GenerateVideoRecommendationsOutputSchema>;


export async function generateVideoRecommendations(
  input: GenerateVideoRecommendationsInput
): Promise<GenerateVideoRecommendationsOutput> {
  console.log('Generating video recommendations for title:', input.playlistTitle);

  // Step 1: Fetch a list of videos from YouTube based on the playlist title
  // The searchVideos service already returns rich data including duration and summary from YouTube
  const videosFromYouTube = await searchVideos(input.playlistTitle, 10); // Fetch up to 10 videos

  if (!videosFromYouTube || videosFromYouTube.length === 0) {
    console.log("No videos found from YouTube search for title:", input.playlistTitle);
    return { recommendedVideos: [] };
  }

  // Prepare the YouTube search results for the AI prompt
  // We pass along all relevant fields that searchVideos provides
  const richYoutubeResultsForPrompt = videosFromYouTube.map(v => ({
    id: v.id,
    title: v.title,
    youtubeURL: v.youtubeURL,
    thumbnail: v.thumbnail,
    duration: v.duration,
    summary: v.summary // This is the original description/summary from YouTube
  }));

  // Step 2: Pass these results to the AI for selection and refined summarization
  const zodJsonSchema = GenerateVideoRecommendationsOutputSchema.openapi('GenerateVideoRecommendationsOutput');
  
  const prompt = `
You are an AI YouTube video recommendation expert.
Your task is to select the most relevant videos from a provided list and enhance their summaries for a playlist.

Playlist Title: "${input.playlistTitle}"

Here is a list of YouTube videos found that might be relevant to the playlist title (including their existing details from YouTube):
${JSON.stringify(richYoutubeResultsForPrompt, null, 2)}

Instructions:
1.  From the list of YouTube videos provided above, select up to 3-5 of the most relevant, high-quality videos that would be excellent additions to a playlist titled "${input.playlistTitle}".
2.  For each video you select, re-format it according to the 'VideoSchema' which is part of the overall 'GenerateVideoRecommendationsOutputSchema' (you will be given this schema to follow for your JSON output).
3.  Ensure you include all fields for each selected video as defined in the VideoSchema: 'id', 'title', 'youtubeURL', 'thumbnail', and 'duration'. You should take these values directly from the provided search results for the videos you select.
4.  For the 'summary' field of each recommended video:
    *   Critically evaluate the existing 'summary' (which is the YouTube video's description) from the search result.
    *   If the existing summary is concise, relevant to the playlist title, and informative, you can use it or a slightly edited version of it.
    *   If the existing summary is too long, irrelevant, or unhelpful, YOU MUST write a new, concise summary (typically 1-3 sentences) that specifically explains WHY this video is a good recommendation for the playlist titled "${input.playlistTitle}". This new summary is crucial for user understanding.
5.  Your final output must be a JSON object that strictly adheres to the 'GenerateVideoRecommendationsOutputSchema'. This means an object with a single key "recommendedVideos", which is an array. Each element in the array should be a video object conforming to the VideoSchema.
6.  If, after reviewing the provided search results, you determine that none of them are suitable or relevant enough for the playlist title, then provide an empty "recommendedVideos" array in your JSON output.
7.  Do not include any conversational text, markdown, or explanations outside the final JSON structure.
`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  
  // Validate the AI's output against our Zod schema
  const parsedAiOutput = GenerateVideoRecommendationsOutputSchema.parse(aiOutput);

  // The AI's output should already contain `RecommendedVideo` objects.
  // The main task of the AI here was selection and crafting good, playlist-relevant summaries.
  // We trust the AI to have selected videos from the provided list and to have used their IDs.
  // We can further enrich/ensure consistency by mapping AI selection back to original data for fields AI might not perfectly reconstruct.
  const finalRecommendedVideos = parsedAiOutput.recommendedVideos.map(aiRecVideo => {
    const originalVideoData = videosFromYouTube.find(ytVid => ytVid.id === aiRecVideo.id);
    if (originalVideoData) {
      return {
        id: originalVideoData.id || aiRecVideo.id, // Prefer original if available
        title: originalVideoData.title || aiRecVideo.title,
        youtubeURL: originalVideoData.youtubeURL || aiRecVideo.youtubeURL,
        thumbnail: originalVideoData.thumbnail || aiRecVideo.thumbnail,
        duration: originalVideoData.duration || aiRecVideo.duration,
        summary: aiRecVideo.summary, // Crucially, take the AI's refined summary
      };
    }
    // If for some reason the AI hallucinates an ID not in the original list,
    // we'll take its data, but this shouldn't happen with the current prompt.
    return aiRecVideo;
  }).filter(Boolean) as RecommendedVideo[];


  console.log('Received recommendations from AI:', finalRecommendedVideos);
  return { recommendedVideos: finalRecommendedVideos };
}

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
  currentVideoTitle: z.string().optional().describe('The title of the currently playing video, if any.'),
  currentVideoSummary: z.string().optional().describe('The summary of the currently playing video, if any.'),
});
export type AnswerPlaylistQuestionInput = z.infer<
  typeof AnswerPlaylistQuestionInputSchema
>;

const AnswerPlaylistQuestionOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the user question based on the playlist content or general knowledge.'),
  sourceType: z
    .enum(['playlist_content', 'current_video', 'general_knowledge'])
    .describe('The primary source used to answer the question.'),
  relevantVideos: z
    .array(z.string())
    .optional()
    .describe('List of video titles that are most relevant to the question.'),
});
export type AnswerPlaylistQuestionOutput = z.infer<
  typeof AnswerPlaylistQuestionOutputSchema
>;

export async function answerPlaylistQuestion(
  input: AnswerPlaylistQuestionInput
): Promise<AnswerPlaylistQuestionOutput> {
  const zodJsonSchema = AnswerPlaylistQuestionOutputSchema;

  const currentVideoContext = input.currentVideoTitle && input.currentVideoSummary 
    ? `\n\nCurrently Playing Video:
Title: "${input.currentVideoTitle}"
Summary: ${input.currentVideoSummary}`
    : '';

  const prompt = `You are an intelligent AI assistant specialized in YouTube playlist content analysis and learning support.

You have access to the following information sources:
1. **Complete Playlist Content**: Video titles, descriptions, summaries, transcripts, and channel information
2. **Current Video Context**: Information about the currently playing video (if available)
3. **General Knowledge**: Your training knowledge for broader context

User's Question: "${input.question}"

Complete Playlist Content:
"""
${input.playlistContent}
"""
${currentVideoContext}

**Instructions for answering:**

1. **Analyze the question type:**
   - Is it about a specific video in the playlist?
   - Is it about the overall playlist topic/theme?
   - Is it asking for explanations of concepts mentioned in the videos?
   - Is it asking for practical applications or examples?
   - Is it asking about instructors, creators, or people in the videos?

2. **Enhanced Information extraction guidelines:**
   - **Channel Names & Instructors**: 
     * "Programming with Mosh" = Mosh Hamedani (popular programming instructor)
     * "Traversy Media" = Brad Traversy
     * "freeCodeCamp.org" = Various instructors
     * "The Net Ninja" = Shaun Pelling
     * "Academind" = Maximilian Schwarzmüller
     * "Corey Schafer" = Corey Schafer (Python expert)
     * "Derek Banas" = Derek Banas
     * Extract instructor names from channel titles and video descriptions
   
   - **Video Titles Analysis**: 
     * Look for concept clues: "OOP", "OOPS", "Object Oriented" = Object-Oriented Programming
     * "Full Course", "Tutorial", "Crash Course" = Educational content
     * Programming languages: "Python", "JavaScript", "Java", "C++", etc.
     * Frameworks: "React", "Angular", "Vue", "Django", "Flask", etc.
     * **Python concepts**: "comparison operators", "variables", "loops", "functions", "classes"
   
   - **Context Clues**: 
     * Use video titles, channel names, and descriptions to infer missing information
     * Look for patterns in video naming conventions
     * Identify course series and learning paths
   
   - **Common Patterns**: 
     * Recognize common programming terms, instructor names, and educational content patterns
     * Identify beginner vs advanced content from titles
     * Detect specific topics within broader subjects

3. **Source prioritization:**
   - **First**: Check if the playlist content directly answers the question
   - **Second**: If asking about the current video, prioritize that context
   - **Third**: Extract information from video titles, channel names, and available metadata
   - **Fourth**: Use general knowledge to supplement or provide broader context
   - **Fifth**: If no relevant information is found, clearly state limitations

4. **Response format:**
   - Provide a clear, helpful answer
   - If using playlist content, reference specific videos when relevant
   - If extracting from titles/channels, mention the source
   - If using general knowledge, clearly indicate this
   - Suggest related videos from the playlist if applicable

5. **Enhanced features:**
   - For concept explanations: Provide examples and practical applications
   - For "how-to" questions: Give step-by-step guidance when possible
   - For comparison questions: Highlight differences and similarities
   - For troubleshooting: Offer multiple potential solutions
   - For instructor/people questions: Extract names from channel information and video context

6. **Output requirements:**
   - answer: Your complete response to the user
   - sourceType: Indicate primary source used ('playlist_content', 'current_video', or 'general_knowledge')
   - relevantVideos: List video titles that relate to the question (if any)

**Special handling for common questions:**
- "Who is the instructor/person in the video?" → Look for channel names like "Programming with Mosh", "Traversy Media", etc.
- "What is OOP/OOPS?" → Recognize this as Object-Oriented Programming concepts
- "What framework/language is this?" → Extract from video titles and descriptions
- "Who is Mosh?" → Mosh Hamedani from "Programming with Mosh" channel
- "What does this video cover?" → Analyze video title and available description/summary
- "Is this for beginners?" → Look for keywords like "beginner", "intro", "basics", "fundamentals"
- **"What are comparison operators?"** → Provide comprehensive explanation with Python examples

**Enhanced Instructor Recognition:**
When asked about instructors or "who is teaching", analyze:
1. Channel names for instructor identification
2. Video descriptions for instructor mentions
3. Common programming educator patterns
4. If channel is "Programming with Mosh" → Instructor is Mosh Hamedani
5. If channel is "Unknown Channel" but title mentions concepts → Provide general guidance about the topic

**Missing Transcript Handling:**
When transcript data is unavailable but the question is about video content:
1. **Acknowledge the limitation**: "While I don't have access to the video transcript..."
2. **Provide educational value**: Give a comprehensive explanation of the concept based on general knowledge
3. **Reference the video**: "Based on the video title 'Python Full Course for Beginners', this likely covers..."
4. **Offer practical examples**: Provide code examples and explanations
5. **Suggest setup**: "For detailed video analysis, transcript data would need to be added to the playlist"

**For Python Programming Questions:**
When asked about Python concepts (like comparison operators), provide:
- Clear definitions and explanations
- Practical code examples
- Common use cases
- Best practices
- How it relates to the video content (even without transcript)

Remember: Be conversational, helpful, and educational. Even when specific video content isn't available, provide valuable learning content based on the question and context. Use all available context clues from video titles, channel names, and metadata to provide comprehensive answers.`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  return AnswerPlaylistQuestionOutputSchema.parse(aiOutput);
}


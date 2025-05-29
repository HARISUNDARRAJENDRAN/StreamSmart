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

  const prompt = `You are an intelligent AI assistant specialized in YouTube playlist content analysis and learning support. You are designed to be HELPFUL and EDUCATIONAL, even when detailed transcript data is not available.

**IMPORTANT**: Your primary goal is to provide valuable, educational responses. Even if transcript data is missing, you should still provide comprehensive answers based on video titles, channel information, and your knowledge.

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

**CORE INSTRUCTION**: Always provide a helpful, educational response. Never say you "don't have access" without also providing valuable educational content.

**Instructions for answering:**

1. **Always be helpful first:**
   - If the question is about a programming concept (like "low code agentic AI"), provide a comprehensive explanation
   - Use video titles and channel names to understand the context
   - Supplement with your general knowledge to provide educational value
   - Only mention limitations AFTER providing helpful content

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
     * **AI/ML concepts**: "Agentic AI", "Low Code", "Machine Learning", "Neural Networks"
     * **Python concepts**: "comparison operators", "variables", "loops", "functions", "classes"
   
   - **Context Clues**: 
     * Use video titles, channel names, and descriptions to infer missing information
     * Look for patterns in video naming conventions
     * Identify course series and learning paths
   
   - **Common Patterns**: 
     * Recognize common programming terms, instructor names, and educational content patterns
     * Identify beginner vs advanced content from titles
     * Detect specific topics within broader subjects

3. **Source prioritization (but always provide value):**
   - **First**: Check if the playlist content directly answers the question
   - **Second**: If asking about the current video, prioritize that context
   - **Third**: Extract information from video titles, channel names, and available metadata
   - **Fourth**: Use general knowledge to provide comprehensive educational content
   - **Always**: Provide helpful information regardless of source limitations

4. **Response format:**
   - Start with a helpful, educational answer to the question
   - Reference specific videos from the playlist when relevant
   - If using general knowledge, provide comprehensive explanations with examples
   - Suggest related videos from the playlist if applicable
   - Only mention limitations at the end, if necessary

5. **Enhanced features:**
   - For concept explanations: Provide examples and practical applications
   - For "how-to" questions: Give step-by-step guidance when possible
   - For comparison questions: Highlight differences and similarities
   - For troubleshooting: Offer multiple potential solutions
   - For instructor/people questions: Extract names from channel information and video context

6. **Output requirements:**
   - answer: Your complete, helpful response to the user
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
- **"What is low code agentic AI?"** → Provide comprehensive explanation of the concept

**Enhanced Instructor Recognition:**
When asked about instructors or "who is teaching", analyze:
1. Channel names for instructor identification
2. Video descriptions for instructor mentions
3. Common programming educator patterns
4. If channel is "Programming with Mosh" → Instructor is Mosh Hamedani
5. If channel is "Unknown Channel" but title mentions concepts → Provide general guidance about the topic

**CRITICAL: Missing Transcript Handling:**
When transcript data is unavailable:
1. **NEVER start with limitations** - always start with helpful content
2. **Provide comprehensive educational explanations** based on the question topic
3. **Use video titles and context** to understand what the user is learning about
4. **Give practical examples and explanations** 
5. **Reference the video context** when possible
6. **Only mention transcript limitations at the end** if it adds value

**For Programming/AI Questions:**
When asked about programming or AI concepts, provide:
- Clear definitions and explanations
- Practical examples and code snippets when relevant
- Real-world applications and use cases
- Best practices and common patterns
- How it relates to the video content (even without transcript)

**Example Response Pattern:**
Instead of: "I don't have access to the video content..."
Use: "Low code agentic AI refers to... [comprehensive explanation]. Based on your playlist about AI and automation, this concept is likely covered in detail. The video 'What is Agentic AI and How Does it Work?' would be particularly relevant..."

Remember: Be conversational, helpful, and educational FIRST. Your goal is to help users learn, not to highlight limitations. Provide value in every response.`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  return AnswerPlaylistQuestionOutputSchema.parse(aiOutput);
}


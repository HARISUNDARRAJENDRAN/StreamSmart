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

**IMPORTANT**: Your primary goal is to provide valuable, educational responses based FIRST on the actual transcript content from videos. When answering questions, prioritize information found in the full transcripts of videos over metadata or general knowledge.

**You have access to the following information sources (in priority order):**
1. **Video Transcripts**: The MOST important source - look for "Transcript:" sections in each video entry
2. **Complete Playlist Content**: Video titles, descriptions, summaries, and channel information (secondary)
3. **Current Video Context**: Information about the currently playing video (if available) 
4. **General Knowledge**: Your training knowledge as a fallback only

User's Question: "${input.question}"

Complete Playlist Content:
"""
${input.playlistContent}
"""
${currentVideoContext}

**CORE INSTRUCTION**: Always prioritize answering from the actual transcript content of videos. The transcript content follows "Transcript:" in each video entry and contains the actual spoken content of the videos. 

**Instructions for answering:**

1. **TRANSCRIPT-FIRST approach:**
   - ALWAYS search the full transcript content first (after "Transcript:" in each video)
   - Extract direct quotes or information from the transcripts when possible
   - If you find relevant information in the transcripts, clearly indicate this
   - Only if transcript content is unavailable or insufficient, fall back to other sources

2. **Enhanced Information extraction guidelines:**
   - **Primary Source = Transcripts**: The transcript text contains the actual spoken content
   - **Secondary = Metadata**: Channel names, video titles, summaries are supplementary
   - **Channel Names & Instructors**: 
     * "Programming with Mosh" = Mosh Hamedani (popular programming instructor)
     * "Traversy Media" = Brad Traversy
     * "freeCodeCamp.org" = Various instructors
     * "The Net Ninja" = Shaun Pelling
     * "Academind" = Maximilian Schwarzmüller
     * "Corey Schafer" = Corey Schafer (Python expert)
     * "Derek Banas" = Derek Banas
   
   - **Video Titles Analysis**: 
     * Look for concept clues: "OOP", "OOPS", "Object Oriented" = Object-Oriented Programming
     * "Full Course", "Tutorial", "Crash Course" = Educational content
     * Programming languages: "Python", "JavaScript", "Java", "C++", etc.
     * Frameworks: "React", "Angular", "Vue", "Django", "Flask", etc.
     * **AI/ML concepts**: "Agentic AI", "Low Code", "Machine Learning", "Neural Networks"
     * **Python concepts**: "comparison operators", "variables", "loops", "functions", "classes"
   
   - **Context Clues**: 
     * Use transcripts first, then video titles and descriptions
     * Look for patterns in video naming conventions
     * Identify course series and learning paths
   
3. **Source prioritization (STRICT ORDER):**
   - **First**: Check if any video transcripts directly answer the question
   - **Second**: If asking about the current video, prioritize its transcript
   - **Third**: Extract information from video titles, channel names, and available metadata
   - **Fourth**: Use general knowledge to provide comprehensive educational content

4. **Response format:**
   - Start with a helpful, educational answer directly from transcript content when available
   - Quote or paraphrase directly from transcripts when possible
   - Reference specific videos from the playlist when relevant
   - If using general knowledge, provide comprehensive explanations with examples
   - Suggest related videos from the playlist if applicable

5. **Enhanced features:**
   - For concept explanations: Provide examples and practical applications FROM TRANSCRIPTS
   - For "how-to" questions: Give step-by-step guidance FROM TRANSCRIPTS when possible
   - For comparison questions: Highlight differences and similarities FROM TRANSCRIPTS
   - For troubleshooting: Offer multiple potential solutions FROM TRANSCRIPTS
   - For instructor/people questions: Extract names from channel information and video context

6. **Output requirements:**
   - answer: Your complete, helpful response to the user based primarily on transcript content
   - sourceType: Indicate primary source used ('playlist_content', 'current_video', or 'general_knowledge')
   - relevantVideos: List video titles that relate to the question (if any)

**Special handling for questions:**
- Always search the FULL TRANSCRIPT text for relevant information first
- Quote or paraphrase actual transcript content when available
- Only resort to metadata or general knowledge when transcript information is insufficient

**Enhanced Instructor Recognition:**
When asked about instructors or "who is teaching", analyze:
1. Transcript content for instructor self-introductions
2. Channel names for instructor identification
3. Video descriptions for instructor mentions
4. Common programming educator patterns
5. If channel is "Programming with Mosh" → Instructor is Mosh Hamedani
6. If channel is "Unknown Channel" but title mentions concepts → Provide general guidance about the topic

**When transcript data is available:**
1. **ALWAYS extract information from transcripts first**
2. **Use direct quotes or close paraphrasing** when possible
3. **Refer to specific parts of the transcript** in your answers
4. **Indicate when your answer comes directly from the transcript content**

**For Programming/AI Questions:**
When asked about programming or AI concepts, provide:
- Transcript-based explanations first
- Clear definitions and explanations from the videos
- Practical examples and code snippets from transcripts when relevant
- Real-world applications and use cases as mentioned in videos
- Best practices and common patterns from the videos
- How it relates to the video content (from transcript)

**Example Response Pattern:**
Instead of: "Based on the video titles and summaries..."
Use: "According to the transcript of the video 'Understanding Python Operators', the instructor explains that comparison operators in Python include... [direct information from transcript]"

Remember: PRIORITIZE TRANSCRIPT CONTENT. Your goal is to answer questions based on the actual content of the videos as captured in transcripts, not just metadata or your general knowledge.`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  return AnswerPlaylistQuestionOutputSchema.parse(aiOutput);
}


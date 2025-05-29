'use server';
/**
 * @fileOverview Enhanced AI flow to generate mind map data using multi-modal analysis.
 * This combines visual and textual analysis for more comprehensive mind maps.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';
import type { MindMapNode as AppMindMapNode, MindMapEdge as AppMindMapEdge } from '@/types';
import { enhanceVideoWithMultiModalAnalysis, type MultiModalSummaryResponse } from '@/services/multimodal-summarizer';

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096,
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
    console.error("Failed to parse AI JSON output for enhanced mind map:", result.response.text(), e);
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}

const EnhancedMindMapNodeSchema = z.object({
  id: z.string().describe('Unique ID for the node.'),
  type: z.string().optional().describe("Node type ('input', 'output', 'default', 'visual', 'temporal')."),
  data: z.object({ 
    label: z.string().describe('The text label displayed on the node.'),
    timestamp: z.number().optional().describe('Associated timestamp for temporal nodes.'),
    visualInsight: z.string().optional().describe('Visual insight associated with this concept.'),
    confidence: z.number().optional().describe('Confidence score from multi-modal analysis.'),
  }),
  position: z.object({ x: z.number(), y: z.number() }),
  style: z.object({
    backgroundColor: z.string().optional().describe('Background color based on analysis type.'),
    borderColor: z.string().optional().describe('Border color for visual distinction.'),
  }).optional(),
}).describe('Enhanced mind map node with multi-modal insights.');

const EnhancedMindMapEdgeSchema = z.object({
  id: z.string().describe('Unique ID for the edge.'),
  source: z.string().describe('Source node ID.'),
  target: z.string().describe('Target node ID.'),
  animated: z.boolean().optional().describe('Whether the edge should be animated.'),
  label: z.string().optional().describe('Edge label describing the relationship.'),
  data: z.object({
    strength: z.number().optional().describe('Relationship strength from multi-modal analysis.'),
    type: z.string().optional().describe('Relationship type (temporal, conceptual, visual).'),
  }).optional(),
  style: z.object({
    strokeWidth: z.number().optional().describe('Edge thickness based on relationship strength.'),
    stroke: z.string().optional().describe('Edge color based on relationship type.'),
  }).optional(),
}).describe('Enhanced mind map edge with relationship insights.');

const GenerateEnhancedMindMapInputSchema = z.object({
  videoId: z.string().describe('The video ID for multi-modal analysis.'),
  youtubeUrl: z.string().describe('The YouTube URL of the video.'),
  sourceText: z.string().optional().describe('Additional source text or existing summary.'),
  maxNodes: z.number().optional().default(15).describe('Maximum number of nodes (enhanced default).'),
  includeTimestamps: z.boolean().optional().default(true).describe('Whether to include timestamp-based nodes.'),
  includeVisualInsights: z.boolean().optional().default(true).describe('Whether to include visual analysis nodes.'),
});
export type GenerateEnhancedMindMapInput = z.infer<typeof GenerateEnhancedMindMapInputSchema>;

const GenerateEnhancedMindMapOutputSchema = z.object({
  nodes: z.array(EnhancedMindMapNodeSchema).describe('Enhanced mind map nodes.'),
  edges: z.array(EnhancedMindMapEdgeSchema).describe('Enhanced mind map edges.'),
  title: z.string().describe('Mind map title.'),
  metadata: z.object({
    processingMethod: z.string().describe('Processing method used (multimodal/fallback).'),
    analysisStats: z.object({
      totalSegments: z.number().optional(),
      totalFrames: z.number().optional(),
      alignmentScore: z.number().optional(),
    }).optional(),
    insights: z.array(z.string()).optional().describe('Key insights from multi-modal analysis.'),
  }),
});
export type GenerateEnhancedMindMapOutput = z.infer<typeof GenerateEnhancedMindMapOutputSchema>;

export async function generateEnhancedMindMap(input: GenerateEnhancedMindMapInput): Promise<GenerateEnhancedMindMapOutput> {
  try {
    console.log('Starting enhanced mind map generation for video:', input.videoId);
    
    // Step 1: Get multi-modal analysis
    const enhancedAnalysis = await enhanceVideoWithMultiModalAnalysis(
      input.videoId,
      input.youtubeUrl,
      input.sourceText
    );
    
    // Step 2: Prepare comprehensive prompt with multi-modal insights
    const multiModalData = enhancedAnalysis.multimodal_data;
    const enhancedSummary = enhancedAnalysis.enhanced_summary;
    
    const prompt = createEnhancedMindMapPrompt(
      enhancedSummary,
      multiModalData,
      input,
      enhancedAnalysis.processing_method
    );
    
    // Step 3: Generate enhanced mind map using Gemini
    const zodJsonSchema = GenerateEnhancedMindMapOutputSchema;
    const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
    const parsedOutput = GenerateEnhancedMindMapOutputSchema.parse(aiOutput);
    
    // Step 4: Enhance the output with additional metadata
    const enhancedOutput = {
      ...parsedOutput,
      metadata: {
        ...parsedOutput.metadata,
        processingMethod: enhancedAnalysis.processing_method,
        analysisStats: multiModalData?.processing_stats ? {
          totalSegments: multiModalData.processing_stats.total_segments,
          totalFrames: multiModalData.processing_stats.total_frames,
          alignmentScore: multiModalData.processing_stats.multimodal_alignment_score,
        } : undefined,
        insights: multiModalData?.visual_insights || [],
      }
    };
    
    console.log('Enhanced mind map generation completed successfully');
    return enhancedOutput;
    
  } catch (error) {
    console.error('Error in enhanced mind map generation:', error);
    
    // Fallback to basic mind map generation
    return {
      nodes: [
        {
          id: 'error-node',
          type: 'input',
          data: { label: 'Mind Map Generation Error' },
          position: { x: 0, y: 0 }
        }
      ],
      edges: [],
      title: 'Error - Enhanced Mind Map',
      metadata: {
        processingMethod: 'error',
        insights: ['An error occurred during enhanced processing']
      }
    };
  }
}

function createEnhancedMindMapPrompt(
  enhancedSummary: string,
  multiModalData: MultiModalSummaryResponse | null,
  input: GenerateEnhancedMindMapInput,
  processingMethod: string
): string {
  const basePrompt = `
You are an advanced AI assistant specialized in creating enhanced mind maps from multi-modal video analysis.
Your task is to create a comprehensive mind map that incorporates both textual and visual insights.

ENHANCED SUMMARY:
${enhancedSummary}

PROCESSING METHOD: ${processingMethod}
`;

  let additionalContext = '';
  
  if (multiModalData && processingMethod === 'multimodal') {
    additionalContext = `
MULTI-MODAL ANALYSIS DATA:

KEY TOPICS:
${multiModalData.key_topics.map(topic => `- ${topic}`).join('\n')}

VISUAL INSIGHTS:
${multiModalData.visual_insights.map(insight => `- ${insight}`).join('\n')}

TIMESTAMP HIGHLIGHTS:
${multiModalData.timestamp_highlights.map(highlight => 
  `- ${Math.floor(highlight.timestamp)}s: ${highlight.description}`
).join('\n')}

PROCESSING STATISTICS:
- Total text segments: ${multiModalData.processing_stats.total_segments}
- Total visual frames: ${multiModalData.processing_stats.total_frames}
- Multi-modal alignment score: ${(multiModalData.processing_stats.multimodal_alignment_score * 100).toFixed(1)}%
- Video duration: ${multiModalData.processing_stats.video_duration} seconds
`;
  }

  const instructions = `
ENHANCED MIND MAP GENERATION INSTRUCTIONS:

1. CENTRAL NODE: Create a central node representing the main topic of the video.
   - Position it at (0, 0)
   - Type: 'input'
   - Use a distinctive background color (#4F46E5)

2. CONCEPT NODES: Create nodes for each key topic identified in the analysis.
   - Type: 'default'
   - Position them in a circular or hierarchical layout around the central node
   - Background color: '#10B981' for main concepts

3. TIMESTAMP NODES (if includeTimestamps is true): Create nodes for important moments.
   - Type: 'temporal'
   - Include timestamp in the data object
   - Background color: '#F59E0B'
   - Position them based on temporal sequence

4. VISUAL INSIGHT NODES (if includeVisualInsights is true): Create nodes for visual analysis.
   - Type: 'visual'
   - Include visualInsight in the data object
   - Background color: '#EF4444'
   - Connect to related concept nodes

5. RELATIONSHIPS: Create meaningful edges between nodes.
   - Use different edge types: 'conceptual', 'temporal', 'visual'
   - Vary stroke width based on relationship strength
   - Color edges based on type:
     * Conceptual: '#6B7280'
     * Temporal: '#F59E0B'
     * Visual: '#EF4444'

6. LAYOUT OPTIMIZATION:
   - Spread nodes across a 1200x800 canvas
   - Avoid overlapping
   - Create visual clusters for related concepts
   - Use temporal ordering for timestamp nodes

7. ENHANCED FEATURES:
   - Add confidence scores where available
   - Include visual insights in node data
   - Use animation for key relationships
   - Vary node sizes based on importance

Maximum nodes: ${input.maxNodes}
Include timestamps: ${input.includeTimestamps}
Include visual insights: ${input.includeVisualInsights}

Generate a comprehensive mind map that effectively visualizes the multi-modal analysis results.
`;

  return basePrompt + additionalContext + instructions;
}

/**
 * Fallback function for basic mind map generation when multi-modal analysis fails
 */
export async function generateBasicMindMapFromVideo(
  videoTitle: string,
  videoSummary: string,
  maxNodes: number = 10
): Promise<GenerateEnhancedMindMapOutput> {
  const prompt = `
Create a basic mind map from this video content:

TITLE: ${videoTitle}
SUMMARY: ${videoSummary}

Create up to ${maxNodes} nodes representing key concepts from this video.
Use a simple hierarchical layout with the main topic as the central node.
`;

  try {
    const zodJsonSchema = GenerateEnhancedMindMapOutputSchema;
    const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
    const parsedOutput = GenerateEnhancedMindMapOutputSchema.parse(aiOutput);
    
    return {
      ...parsedOutput,
      metadata: {
        processingMethod: 'basic_fallback',
        insights: ['Generated using basic text analysis only']
      }
    };
  } catch (error) {
    console.error('Error in basic mind map generation:', error);
    return {
      nodes: [],
      edges: [],
      title: 'Basic Mind Map - Error',
      metadata: {
        processingMethod: 'error',
        insights: ['Failed to generate mind map']
      }
    };
  }
} 

'use server';
/**
 * @fileOverview AI flow to generate mind map data from text or a URL.
 *
 * - generateMindMap - A function that generates mind map nodes and edges.
 * - GenerateMindMapInput - The input type for the generateMindMap function.
 * - GenerateMindMapOutput - The return type for the generateMindMap function.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from 'zod';
import type { MindMapNode as AppMindMapNode, MindMapEdge as AppMindMapEdge } from '@/types'; // Renamed to avoid conflict

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096, // Increased for potentially larger mind maps
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
    console.error("Failed to parse AI JSON output for generateMindMap:", result.response.text(), e);
    throw new Error("The AI returned an unexpected response. Please try again.");
  }
}


const MindMapNodeSchema = z.object({
  id: z.string().describe('Unique ID for the node (e.g., "node-1", "concept-a").'),
  type: z.string().optional().describe("Node type (e.g., 'input', 'output', 'default'). Default is 'default' if not specified."),
  data: z.object({ label: z.string().describe('The text label displayed on the node.') }),
  position: z.object({ x: z.number().describe('X-coordinate for node positioning.'), y: z.number().describe('Y-coordinate for node positioning.') }),
}).describe('Represents a single node in the mind map.');
export type GenerateMindMapNode = z.infer<typeof MindMapNodeSchema>;


const MindMapEdgeSchema = z.object({
  id: z.string().describe('Unique ID for the edge (e.g., "edge-1-2").'),
  source: z.string().describe('The ID of the source node for this edge.'),
  target: z.string().describe('The ID of the target node for this edge.'),
  animated: z.boolean().optional().describe('Whether the edge should be animated.'),
  label: z.string().optional().describe('Optional label for the edge.')
}).describe('Represents a connection (edge) between two nodes in the mind map.');
export type GenerateMindMapEdge = z.infer<typeof MindMapEdgeSchema>;


const GenerateMindMapInputSchema = z.object({
  sourceTextOrUrl: z.string().describe('The source text, playlist title, or YouTube URL to generate a mind map from.'),
  maxNodes: z.number().optional().default(10).describe('Maximum number of nodes to include in the mind map (excluding the root).'),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

const GenerateMindMapOutputSchema = z.object({
  nodes: z.array(MindMapNodeSchema).describe('An array of node objects for the mind map.'),
  edges: z.array(MindMapEdgeSchema).describe('An array of edge objects connecting the nodes.'),
  title: z.string().optional().describe('A suggested title for the mind map, derived from the input.')
});
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;


export async function generateMindMap(input: GenerateMindMapInput): Promise<GenerateMindMapOutput> {
  const zodJsonSchema = GenerateMindMapOutputSchema.openapi('GenerateMindMapOutput');
  
  const prompt = `
You are an AI assistant specialized in creating structured mind maps from provided text, titles, or YouTube video URLs.
Your primary goal is to identify key concepts and their relationships to construct a clear, logically organized mind map suitable for visualization with ReactFlow.

Input Content:
"${input.sourceTextOrUrl}"

Maximum number of nodes (excluding the root/central topic): ${input.maxNodes}

Instructions for Mind Map Generation:
1.  Analyze the 'Input Content'. If it's a YouTube URL, infer the main topics from its likely title or overall subject matter. If it's text or a title, use that directly as the basis.
2.  Identify the central theme or main topic. This will be the root node of your mind map. Often, its type should be 'input' or a distinct central type. Position it near (0,0) (e.g., { x: 0, y: 0 } or { x: 250, y: 0 }).
3.  Extract key sub-topics, concepts, or ideas related to the central theme. These will form the other nodes. Generate up to a maximum of ${input.maxNodes} such sub-topic nodes.
4.  For each node, assign a unique 'id' (e.g., "node-1", "node-root", "concept-X").
5.  For each node, provide a concise 'label' for its 'data' object (e.g., { "data": { "label": "Concept A" } }).
6.  Determine logical connections (edges) between the nodes. Edges represent relationships like 'leads to', 'is part of', 'explains', etc.
7.  For each edge, assign a unique 'id' (e.g., "edge-1-2"), and correctly link 'source' and 'target' node IDs. Optionally, provide a 'label' for the edge to describe the relationship, and set 'animated' to true for some key connections if it makes sense.
8.  Assign (x, y) 'position' coordinates for each node to ensure a visually balanced and readable layout. Nodes should not overlap significantly. Spread them out logically from the root. Use a reasonable coordinate range (e.g., x and y values between -600 and 600).
9.  Provide a concise 'title' for the overall mind map, ideally derived or summarized from the 'Input Content'.
10. Ensure your entire output strictly follows the JSON format defined by the Zod schema for 'GenerateMindMapOutputSchema'.
11. If the 'Input Content' is very short, unclear, or insufficient to generate a meaningful mind map, create a simple 2-3 node map representing the input, or if truly not possible, you may return an empty 'nodes' and 'edges' array with a title indicating no map could be generated.

Example Node: { "id": "node-1", "type": "default", "data": { "label": "Concept A" }, "position": { "x": 100, "y": 50 } }
Example Edge: { "id": "edge-1-2", "source": "node-1", "target": "node-2", "label": "is related to", "animated": false }

Please generate the mind map data.
`;

  const aiOutput = await runChat([{text: prompt}], zodJsonSchema);
  const parsedOutput = GenerateMindMapOutputSchema.parse(aiOutput);
  
  // Basic validation or fallback
  if (!parsedOutput) {
      return { nodes: [], edges: [], title: "Mind Map (Error)" };
  }
  return {
      nodes: Array.isArray(parsedOutput.nodes) ? parsedOutput.nodes : [],
      edges: Array.isArray(parsedOutput.edges) ? parsedOutput.edges : [],
      title: parsedOutput.title || input.sourceTextOrUrl.substring(0, 30)
  };
}



'use server';
/**
 * @fileOverview AI flow to generate mind map data from text or a URL.
 *
 * - generateMindMap - A function that generates mind map nodes and edges.
 * - GenerateMindMapInput - The input type for the generateMindMap function.
 * - GenerateMindMapOutput - The return type for the generateMindMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { MindMapNode, MindMapEdge } from '@/types';

const MindMapNodeSchema = z.object({
  id: z.string().describe('Unique ID for the node.'),
  type: z.string().optional().describe("Node type (e.g., 'input', 'output', 'default'). Default is 'default' if not specified."),
  data: z.object({ label: z.string().describe('The text label displayed on the node.') }),
  position: z.object({ x: z.number().describe('X-coordinate for node positioning.'), y: z.number().describe('Y-coordinate for node positioning.') }),
}).describe('Represents a single node in the mind map.');
export type GenerateMindMapNode = z.infer<typeof MindMapNodeSchema>;


const MindMapEdgeSchema = z.object({
  id: z.string().describe('Unique ID for the edge.'),
  source: z.string().describe('The ID of the source node for this edge.'),
  target: z.string().describe('The ID of the target node for this edge.'),
  animated: z.boolean().optional().describe('Whether the edge should be animated.'),
  label: z.string().optional().describe('Optional label for the edge.')
}).describe('Represents a connection (edge) between two nodes in the mind map.');
export type GenerateMindMapEdge = z.infer<typeof MindMapEdgeSchema>;


const GenerateMindMapInputSchema = z.object({
  sourceTextOrUrl: z.string().describe('The source text, playlist title, or YouTube URL to generate a mind map from.'),
  maxNodes: z.number().optional().default(10).describe('Maximum number of nodes to include in the mind map.'),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

const GenerateMindMapOutputSchema = z.object({
  nodes: z.array(MindMapNodeSchema).describe('An array of node objects for the mind map.'),
  edges: z.array(MindMapEdgeSchema).describe('An array of edge objects connecting the nodes.'),
  title: z.string().optional().describe('A suggested title for the mind map, derived from the input.')
});
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;


export async function generateMindMap(input: GenerateMindMapInput): Promise<GenerateMindMapOutput> {
  return generateMindMapFlow(input);
}

const mindMapPrompt = ai.definePrompt({
  name: 'generateMindMapPrompt',
  input: {schema: GenerateMindMapInputSchema},
  output: {schema: GenerateMindMapOutputSchema},
  prompt: `
You are an AI assistant specialized in creating structured mind maps from provided text, titles, or YouTube video URLs.
Your goal is to identify key concepts, entities, and their relationships to construct a clear and concise mind map.

Input Content:
{{{sourceTextOrUrl}}}

Instructions:
1.  Analyze the 'Input Content'. If it's a YouTube URL, infer the main topics from the likely title or content. If it's text or a title, use that directly.
2.  Identify the central theme or main idea. This should be your root node (e.g., type: 'input').
3.  Extract up to {{{maxNodes}}} key sub-topics, concepts, or entities related to the central theme. These will be other nodes.
4.  Determine logical connections (edges) between these nodes. Edges should represent relationships like 'leads to', 'is part of', 'explains', 'contrasts with', etc. You can optionally label edges.
5.  Assign appropriate positions (x, y coordinates) for each node to create a visually balanced and readable layout. Start the root node near (0,0) and arrange other nodes radially or hierarchically.
    - For x and y coordinates, use values typically between -500 and 500.
    - Ensure nodes do not excessively overlap.
6.  Provide a concise 'title' for the mind map based on the input content.
7.  Structure your output strictly according to the 'GenerateMindMapOutputSchema' JSON format, ensuring all node and edge IDs are unique strings. Ensure all 'source' and 'target' fields in edges correspond to valid node 'id's.
8.  If the input is very short or unclear, try to make a simple mind map with 2-3 nodes or return empty nodes and edges if no meaningful map can be created.

Example Node: { "id": "node-1", "type": "default", "data": { "label": "Concept A" }, "position": { "x": 100, "y": 50 } }
Example Edge: { "id": "edge-1-2", "source": "node-1", "target": "node-2", "label": "is related to" }

Generate the mind map now.
`,
});

const generateMindMapFlow = ai.defineFlow(
  {
    name: 'generateMindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
  },
  async (input: GenerateMindMapInput) => {
    const {output} = await mindMapPrompt(input);
    if (!output) {
        console.error('AI did not return an output for mind map generation.');
        // Return a default empty state or a minimal map
        return { nodes: [], edges: [], title: "Mind Map (Error)" };
    }
    // Ensure nodes and edges are arrays, even if AI messes up
    return {
        nodes: Array.isArray(output.nodes) ? output.nodes : [],
        edges: Array.isArray(output.edges) ? output.edges : [],
        title: output.title || input.sourceTextOrUrl.substring(0, 30)
    };
  }
);

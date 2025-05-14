
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
You are an AI assistant specialized in creating structured mind maps from text, titles, or YouTube video URLs.
Your task is to identify key concepts and their relationships to construct a clear mind map.

Input Content:
{{{sourceTextOrUrl}}}

Instructions:
1.  Analyze the 'Input Content'. If it's a YouTube URL, infer topics from its likely title or content. If it's text/title, use that directly.
2.  Identify the central theme for the root node (e.g., type: 'input').
3.  Extract up to {{{maxNodes}}} key sub-topics/concepts. These are other nodes.
4.  Determine logical connections (edges) between nodes. Edges represent relationships (e.g., 'leads to', 'is part of'). Optionally label edges.
5.  Assign (x, y) positions for a balanced layout. Start the root node near (0,0). Use values between -500 and 500, avoiding overlap.
6.  Provide a concise 'title' for the mind map based on the input.
7.  Ensure your output strictly follows the 'GenerateMindMapOutputSchema' JSON format, with unique node/edge IDs and valid source/target links.
8.  If input is very short/unclear, create a simple 2-3 node map or return empty nodes/edges if no meaningful map is possible.

Example Node: { "id": "node-1", "type": "default", "data": { "label": "Concept A" }, "position": { "x": 100, "y": 50 } }
Example Edge: { "id": "edge-1-2", "source": "node-1", "target": "node-2", "label": "is related to" }

Please generate the mind map data.
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


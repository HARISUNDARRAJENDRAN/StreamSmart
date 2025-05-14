
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { BrainIcon, ExpandIcon, DownloadIcon, XIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { generateMindMap, type GenerateMindMapInput } from '@/ai/flows/generate-mind-map-flow';
import type { MindMapNode as AppMindMapNode, MindMapEdge as AppMindMapEdge } from '@/types'; // Our app's types

interface MindMapDisplayProps {
  playlistTitle: string; // Changed from optional to required for initial generation
  playlistId: string; // To ensure unique flow calls if needed, or for future features
}

// Initial static nodes and edges for placeholder/fallback
const initialNodes: Node<AppMindMapNode['data']>[] = [
  { id: '1', type: 'input', data: { label: 'Playlist Topic' }, position: { x: 250, y: 5 } },
  { id: '2', data: { label: 'Key Concept A' }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'Key Concept B' }, position: { x: 400, y: 100 } },
  { id: '4', type: 'output', data: { label: 'Conclusion/Summary' }, position: { x: 250, y: 200 } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
];


export function MindMapDisplay({ playlistTitle, playlistId }: MindMapDisplayProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();
  
  const [nodes, setNodes] = useState<Node<AppMindMapNode['data']>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState(playlistTitle);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const fetchMindMapData = useCallback(async (title: string) => {
    setIsLoading(true);
    setNodes([]); // Clear previous nodes
    setEdges([]); // Clear previous edges
    setGeneratedTitle("Generating Mind Map...");

    try {
      const input: GenerateMindMapInput = { sourceTextOrUrl: title, maxNodes: 10 };
      const result = await generateMindMap(input);
      
      if (result && result.nodes.length > 0) {
        // Transform AI output to ReactFlow compatible nodes/edges
        const reactFlowNodes: Node<AppMindMapNode['data']>[] = result.nodes.map(node => ({
          id: node.id,
          type: node.type || 'default',
          data: { label: node.data.label },
          position: node.position,
        }));
        const reactFlowEdges: Edge[] = result.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.animated || false,
          label: edge.label
        }));
        
        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        setGeneratedTitle(result.title || title);
        toast({ title: "Mind Map Generated", description: `Created a mind map for "${result.title || title}".` });
      } else {
        // Fallback to initial example if AI returns no nodes
        setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: title}} : n));
        setEdges(initialEdges);
        setGeneratedTitle(title + " (Example)");
        toast({ title: "Mind Map Issue", description: "Could not generate a new mind map, showing example.", variant: "default" });
      }
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: title}} : n)); // Fallback on error
      setEdges(initialEdges);
      setGeneratedTitle(title + " (Error)");
      toast({
        title: "Mind Map Error",
        description: `Failed to generate mind map: ${error.message || 'Unknown error'}. Showing example.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (playlistTitle) {
      fetchMindMapData(playlistTitle);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistTitle]); // Removed fetchMindMapData from deps to avoid re-trigger loop, playlistTitle is the trigger.


  const handleDownloadMindMap = () => {
    toast({
      title: "Download Mind Map",
      description: "Download functionality will be implemented soon!",
    });
  };
  
  const reactFlowContent = (
    <div className="w-full h-full bg-background rounded-md">
      {isLoading && nodes.length === 0 ? (
         <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
           <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
           <p>Generating Mind Map for "{playlistTitle}"...</p>
         </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      )}
    </div>
  );

  return (
    <Card className="shadow-lg flex flex-col h-full"> {/* Ensure card takes full height of its container */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-grow min-w-0">
            <CardTitle className="flex items-center text-lg md:text-xl truncate">
            <BrainIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary shrink-0" />
            <span className="truncate" title={generatedTitle || playlistTitle}>Mind Map: {generatedTitle || playlistTitle}</span>
            </CardTitle>
            {isLoading && <CardDescription className="text-xs">AI is thinking...</CardDescription>}
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => fetchMindMapData(playlistTitle)} disabled={isLoading} aria-label="Refresh Mind Map">
            <RotateCcwIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Dialog open={isFullScreenOpen} onOpenChange={setIsFullScreenOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="View Fullscreen">
                <ExpandIcon className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-none w-[95vw] h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-3 md:p-4 border-b flex flex-row items-center justify-between">
                <DialogTitle className="flex items-center truncate">
                  <BrainIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-primary shrink-0" />
                  <span className="truncate">Mind Map: {generatedTitle || playlistTitle} (Fullscreen)</span>
                </DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon">
                    <XIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </DialogHeader>
              <div className="flex-grow p-1 md:p-2 overflow-auto bg-card">
                {reactFlowContent}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={handleDownloadMindMap} aria-label="Download Mind Map" disabled={isLoading}>
            <DownloadIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-1 md:p-2"> {/* Ensure content area can grow */}
        {/* Aspect ratio for the embedded view, ensure it doesn't collapse */}
        <div className="w-full h-full min-h-[300px] md:min-h-[400px]">  {/* Ensure minimum height */}
          {reactFlowContent}
        </div>
      </CardContent>
    </Card>
  );
}


'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { generateMindMap, type GenerateMindMapInput, type GenerateMindMapNode, type GenerateMindMapEdge } from '@/ai/flows/generate-mind-map-flow';

interface MindMapDisplayProps {
  playlistTitle: string;
  playlistId: string; 
}

const initialNodes: Node<GenerateMindMapNode['data']>[] = [
  { id: '1', type: 'input', data: { label: 'Playlist Topic (Example)' }, position: { x: 250, y: 5 } },
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
  
  const [nodes, setNodes] = useState<Node<GenerateMindMapNode['data']>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState(playlistTitle);
  const mindMapContainerRef = useRef<HTMLDivElement>(null);

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
    setNodes([]); 
    setEdges([]); 
    setGeneratedTitle("Generating Mind Map...");

    try {
      const input: GenerateMindMapInput = { sourceTextOrUrl: title, maxNodes: 10 };
      const result = await generateMindMap(input);
      
      if (result && result.nodes.length > 0) {
        const reactFlowNodes: Node<GenerateMindMapNode['data']>[] = result.nodes.map(node => ({
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
        const exampleTitle = title || "Example Playlist";
        setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: exampleTitle}} : n));
        setEdges(initialEdges);
        setGeneratedTitle(exampleTitle + " (Example)");
        toast({ title: "Mind Map Issue", description: "Could not generate a new mind map, showing example.", variant: "default" });
      }
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      const errorTitle = title || "Error Playlist";
      setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: errorTitle}} : n));
      setEdges(initialEdges);
      setGeneratedTitle(errorTitle + " (Error)");
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
  }, [playlistTitle, fetchMindMapData]);


  const handleDownloadMindMap = () => {
    const containerToDownloadFrom = mindMapContainerRef.current; 
    if (!containerToDownloadFrom) {
      toast({ title: "Download Error", description: "Mind map container not ready or found.", variant: "destructive" });
      return;
    }

    const svgElement = containerToDownloadFrom.querySelector('.react-flow__renderer > svg');

    if (svgElement) {
      const clonedSvgElement = svgElement.cloneNode(true) as SVGSVGElement;
      const { width, height } = containerToDownloadFrom.getBoundingClientRect();
      
      clonedSvgElement.setAttribute('width', String(width));
      clonedSvgElement.setAttribute('height', String(height));
      if (!clonedSvgElement.getAttribute('xmlns')) {
          clonedSvgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      clonedSvgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvgElement);
      const finalSvgString = `<?xml version="1.0" standalone="no"?>\r\n${svgString}`;
      
      const svgBlob = new Blob([finalSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = (generatedTitle || 'mindmap').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
      link.download = `${filename || 'mindmap'}.svg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Mind Map Downloaded", description: "SVG file saved." });
    } else {
      toast({ title: "Download Error", description: "Could not find SVG element to download.", variant: "destructive" });
    }
  };
  
  const renderReactFlowContent = (isFullScreenContext: boolean) => (
    <div 
      className="w-full h-full bg-background rounded-md"
      ref={!isFullScreenContext ? mindMapContainerRef : null}
    >
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
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      )}
    </div>
  );

  return (
    <Card className="shadow-lg flex flex-col h-full">
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
              <Button variant="outline" size="icon" aria-label="View Fullscreen" disabled={isLoading}>
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
                {renderReactFlowContent(true)}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={handleDownloadMindMap} aria-label="Download Mind Map" disabled={isLoading || nodes.length === 0}>
            <DownloadIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-1 md:p-2">
        <div className="w-full h-full min-h-[300px] md:min-h-[400px]">
          {renderReactFlowContent(false)}
        </div>
      </CardContent>
    </Card>
  );
}

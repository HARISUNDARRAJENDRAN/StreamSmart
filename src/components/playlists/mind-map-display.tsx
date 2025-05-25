'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { BrainIcon, ExpandIcon, DownloadIcon, XIcon, Loader2Icon, RotateCcwIcon, ImageIcon, FileTextIcon, MinimizeIcon, MaximizeIcon, AlertCircleIcon, RefreshCwIcon } from 'lucide-react';
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
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { generateMindMap, type GenerateMindMapInput, type GenerateMindMapNode, type GenerateMindMapEdge } from '@/ai/flows/generate-mind-map-flow';

interface MindMapDisplayProps {
  playlistTitle: string;
  playlistId: string; 
}

// Enhanced node styles for better visibility
const nodeStyles = {
  default: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #4f46e5',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    minWidth: '120px',
    textAlign: 'center',
  },
  input: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: '3px solid #ec4899',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '700',
    padding: '16px 20px',
    boxShadow: '0 6px 16px rgba(236, 72, 153, 0.3)',
    minWidth: '160px',
    textAlign: 'center',
  },
  output: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white',
    border: '2px solid #0ea5e9',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 16px',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
    minWidth: '140px',
    textAlign: 'center',
  },
};

const initialNodes: Node<GenerateMindMapNode['data']>[] = [
  { 
    id: '1', 
    type: 'input', 
    data: { label: 'Playlist Topic' }, 
    position: { x: 250, y: 50 },
    style: nodeStyles.input,
  },
  { 
    id: '2', 
    data: { label: 'Key Concept A' }, 
    position: { x: 100, y: 150 },
    style: nodeStyles.default,
  },
  { 
    id: '3', 
    data: { label: 'Key Concept B' }, 
    position: { x: 400, y: 150 },
    style: nodeStyles.default,
  },
  { 
    id: '4', 
    type: 'output', 
    data: { label: 'Learning Outcome' }, 
    position: { x: 250, y: 250 },
    style: nodeStyles.output,
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#ffffff', strokeWidth: 3 } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#ffffff', strokeWidth: 3 } },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#00f2fe', strokeWidth: 3 } },
  { id: 'e3-4', source: '3', target: '4', style: { stroke: '#00f2fe', strokeWidth: 3 } },
];

export function MindMapDisplay({ playlistTitle, playlistId }: MindMapDisplayProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();
  
  const [nodes, setNodes] = useState<Node<GenerateMindMapNode['data']>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState(playlistTitle);
  const mindMapContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);

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
      const input: GenerateMindMapInput = { sourceTextOrUrl: title, maxNodes: 12 };
      const result = await generateMindMap(input);
      
      if (result && result.nodes.length > 0) {
        const reactFlowNodes: Node<GenerateMindMapNode['data']>[] = result.nodes.map(node => {
          const nodeType = node.type || 'default';
          return {
          id: node.id,
            type: nodeType,
          data: { label: node.data.label },
          position: node.position,
            style: nodeStyles[nodeType as keyof typeof nodeStyles] || nodeStyles.default,
          };
        });
        
        const reactFlowEdges: Edge[] = result.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.animated || false,
          label: edge.label,
          style: { stroke: '#ffffff', strokeWidth: 3 },
        }));
        
        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        setGeneratedTitle(result.title || title);
        toast({ 
          title: "Mind Map Generated! 🧠", 
          description: `Created an interactive mind map for "${result.title || title}".` 
        });
      } else {
        const exampleTitle = title || "Example Playlist";
        setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: exampleTitle}} : n));
        setEdges(initialEdges);
        setGeneratedTitle(exampleTitle + " (Example)");
        toast({ 
          title: "Mind Map Ready", 
          description: "Showing example mind map structure.", 
          variant: "default" 
        });
      }
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      const errorTitle = title || "Error Playlist";
      setNodes(initialNodes.map(n => n.id === '1' ? {...n, data: {label: errorTitle}} : n));
      setEdges(initialEdges);
      setGeneratedTitle(errorTitle + " (Example)");
      toast({
        title: "Mind Map Error",
        description: `Failed to generate mind map. Showing example structure.`,
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

  const downloadAsSVG = (containerRef: React.RefObject<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) {
      toast({ title: "Download Error", description: "Mind map container not ready.", variant: "destructive" });
      return;
    }

    const svgElement = container.querySelector('.react-flow__renderer > svg');
    if (svgElement) {
      const clonedSvgElement = svgElement.cloneNode(true) as SVGSVGElement;
      const { width, height } = container.getBoundingClientRect();
      
      clonedSvgElement.setAttribute('width', String(Math.max(width, 800)));
      clonedSvgElement.setAttribute('height', String(Math.max(height, 600)));
          clonedSvgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvgElement);
      const finalSvgString = `<?xml version="1.0" standalone="no"?>\r\n${svgString}`;
      
      const svgBlob = new Blob([finalSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = (generatedTitle || 'mindmap').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
      link.download = `${filename}_mindmap.svg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Mind Map Downloaded! 📥", description: "SVG file saved to your downloads." });
    } else {
      toast({ title: "Download Error", description: "Could not find mind map to download.", variant: "destructive" });
    }
  };
  
  const downloadAsPNG = async (containerRef: React.RefObject<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) {
      toast({ title: "Download Error", description: "Mind map container not ready.", variant: "destructive" });
      return;
    }

    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Wait a moment for any animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a high-quality canvas with better options
      const canvas = await html2canvas(container, {
        backgroundColor: '#000000', // Black background
        scale: 2, // Good quality without being too heavy
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false, // Disable for better compatibility
        logging: false,
        width: container.offsetWidth,
        height: container.offsetHeight,
        ignoreElements: (element) => {
          // Ignore controls and minimap that might interfere
          return element.classList.contains('react-flow__controls') || 
                 element.classList.contains('react-flow__minimap') ||
                 element.classList.contains('react-flow__attribution');
        },
        onclone: (clonedDoc, element) => {
          // Find the cloned container
          const clonedContainer = clonedDoc.querySelector('[data-testid="rf__wrapper"]') || 
                                 clonedDoc.querySelector('.react-flow') ||
                                 element;
          
          if (clonedContainer) {
            // Set black background
            clonedContainer.style.backgroundColor = '#000000 !important';
            
            // Force all edges to be visible with white color for contrast
            const edges = clonedContainer.querySelectorAll('.react-flow__edge path');
            edges.forEach((edge: any) => {
              edge.style.stroke = '#ffffff !important';
              edge.style.strokeWidth = '3px !important';
              edge.style.fill = 'none !important';
              edge.style.opacity = '1 !important';
              edge.style.visibility = 'visible !important';
              edge.setAttribute('stroke', '#ffffff');
              edge.setAttribute('stroke-width', '3');
              edge.setAttribute('fill', 'none');
            });
            
            // Make edge labels visible
            const edgeLabels = clonedContainer.querySelectorAll('.react-flow__edge-text');
            edgeLabels.forEach((label: any) => {
              label.style.fill = '#ffffff !important';
              label.style.color = '#ffffff !important';
              label.style.fontSize = '12px !important';
              label.style.fontWeight = 'bold !important';
            });
            
            // Enhance node visibility with better contrast
            const nodes = clonedContainer.querySelectorAll('.react-flow__node');
            nodes.forEach((node: any) => {
              // Keep existing gradients but ensure visibility
              node.style.opacity = '1 !important';
              node.style.visibility = 'visible !important';
              node.style.transform = node.style.transform || 'translate(0px, 0px)';
              
              // Enhance text visibility
              const nodeText = node.querySelectorAll('div, span, p');
              nodeText.forEach((text: any) => {
                text.style.color = '#ffffff !important';
                text.style.fontWeight = 'bold !important';
                text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8) !important';
              });
            });
            
            // Make background pattern visible but subtle
            const background = clonedContainer.querySelector('.react-flow__background');
            if (background) {
              background.style.opacity = '0.1 !important';
              const patterns = background.querySelectorAll('circle, rect, path');
              patterns.forEach((pattern: any) => {
                pattern.style.fill = '#ffffff !important';
                pattern.style.stroke = '#ffffff !important';
              });
            }
            
            // Ensure the viewport is properly positioned
            const viewport = clonedContainer.querySelector('.react-flow__viewport');
            if (viewport) {
              viewport.style.transform = viewport.style.transform || 'translate(0px, 0px) scale(1)';
            }
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `${(generatedTitle || 'mindmap').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase()}_mindmap.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      toast({ title: "Mind Map Downloaded! 📥", description: "High-quality PNG with black background saved to your downloads." });
    } catch (error) {
      console.error('Error downloading PNG:', error);
      // Fallback to SVG download
      downloadAsSVG(containerRef);
      toast({ title: "PNG Export Failed", description: "Downloaded as SVG instead. PNG export had technical issues.", variant: "default" });
    }
  };
  
  const renderReactFlowContent = (isFullScreenContext: boolean) => {
    return (
      <div 
        className={`relative bg-black ${
          isFullScreenContext 
            ? 'h-full w-full' 
            : 'h-[500px] w-full'
        }`}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <BrainIcon className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="mt-6 text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Generating Mind Map...</h3>
              <p className="text-sm text-gray-300 max-w-md">
                Analyzing "{playlistTitle}" and creating a comprehensive mind map
              </p>
            </div>
         </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            className="bg-black"
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#ffffff" 
              className="opacity-10"
            />
            <Controls 
              className={`${isFullScreenContext ? 'block' : 'hidden'} bg-black/90 backdrop-blur-sm border border-gray-600 rounded-lg`}
              showZoom={true}
              showFitView={true}
              showInteractive={true}
            />
            <MiniMap 
              className={`${isFullScreenContext ? 'block' : 'hidden'} bg-black/90 backdrop-blur-sm border border-gray-600 rounded-lg`}
              nodeColor="#4f46e5"
              maskColor="rgba(255, 255, 255, 0.1)"
              pannable
              zoomable
            />
        </ReactFlow>
      )}
    </div>
  );
  };

  return (
    <Card className="w-full h-full min-h-[600px] shadow-lg border-2 border-primary/20">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BrainIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">
                Mind Map: {generatedTitle || 'Generating Mind Map...'}
            </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {isLoading ? 'AI is generating your mind map...' : `Analyzing "${playlistTitle}"`}
              </CardDescription>
            </div>
        </div>
          
          {!isLoading && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAsSVG(mindMapContainerRef)}
                className="hover:bg-primary/10 border-primary/30"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAsPNG(mindMapContainerRef)}
                className="hover:bg-primary/10 border-primary/30"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                PNG
          </Button>
          <Dialog open={isFullScreenOpen} onOpenChange={setIsFullScreenOpen}>
            <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-primary/10 border-primary/30"
                  >
                    <MaximizeIcon className="h-4 w-4 mr-2" />
                    Fullscreen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-none w-[95vw] h-[90vh] flex flex-col p-0">
                  <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
                <DialogTitle className="flex items-center truncate">
                      <BrainIcon className="h-6 w-6 mr-2 text-primary shrink-0" />
                      <span className="truncate">Mind Map: {generatedTitle || playlistTitle}</span>
                </DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon">
                    <XIcon className="h-5 w-5" />
                  </Button>
                </DialogClose>
              </DialogHeader>
                  <div className="flex-grow p-2 overflow-hidden" ref={fullScreenContainerRef}>
                {renderReactFlowContent(true)}
              </div>
            </DialogContent>
          </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMindMapData(playlistTitle)}
                className="hover:bg-accent/10 border-accent/30"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Regenerate
          </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative" ref={mindMapContainerRef}>
          {renderReactFlowContent(false)}
      </CardContent>
    </Card>
  );
}

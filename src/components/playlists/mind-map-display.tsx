'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { BrainIcon, ExpandIcon, DownloadIcon, XIcon, Loader2Icon, RotateCcwIcon, ImageIcon, FileTextIcon, MinimizeIcon, MaximizeIcon, AlertCircleIcon, RefreshCwIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
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
  Handle,
  Position,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Elk, { type ElkNode, type ElkExtendedEdge, type LayoutOptions } from 'elkjs/lib/elk.bundled.js';

interface CollapsibleNodeData {
  label: string;
  description?: string;
  expanded?: boolean;
  childrenIds?: string[]; 
  level?: number;
  width?: number; 
  height?: number; 
}

const elk = new Elk();

// ELK layout options - refined for a more balanced, top-down tree structure
const elkLayoutOptions: LayoutOptions = {
  'elk.algorithm': 'layered', // Start with layered, can experiment with mrtree or radial
  'elk.direction': 'DOWN',
  'elk.alignment': 'CENTER', // Attempt to center nodes within their layer
  'elk.layered.spacing.nodeNodeBetweenLayers': '100', // Spacing between layers
  'elk.spacing.nodeNode': '80', // Spacing between nodes in the same layer
  'elk.edgeRouting': 'POLYLINE', // POLYLINE can be smoother than ORTHOGONAL for some trees
  'elk.layered.compaction.postCompaction.strategy': 'BALANCED', // Try to balance layer widths
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF', // Good general purpose placer
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN', // Important for ELK to understand hierarchy properly
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', // Encourage respecting input order for siblings
};

const getLayoutedElements = async (
  nodesToLayout: Node<CollapsibleNodeData>[], 
  edgesToLayout: Edge[], 
  options: LayoutOptions
): Promise<{ nodes: Node<CollapsibleNodeData>[], edges: Edge[] }> => {
  const elkNodes: ElkNode[] = [];
  const elkEdges: ElkExtendedEdge[] = [];

  nodesToLayout.forEach((node) => {
    elkNodes.push({
      id: node.id,
      width: node.data.width || 250, // Default width if not set by node
      height: node.data.height || 80, // Default height if not set by node
      layoutOptions: {
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `[${node.data.width || 250}, ${node.data.height || 80}]`,
      },
      // If we want ELK to understand hierarchy for certain algorithms like 'mrtree':
      // children: node.data.childrenIds?.map(childId => nodesToLayout.find(n => n.id === childId && !n.hidden)).filter(Boolean).map(cn => ({id: cn!.id})) || []
    });
  });

  edgesToLayout.forEach((edge) => {
    elkEdges.push({ id: edge.id, sources: [edge.source], targets: [edge.target] });
  });

  const graphToLayout: ElkNode = {
    id: 'root',
    layoutOptions: options,
    children: elkNodes.filter(n => !nodesToLayout.find(rn => rn.id === n.id)?.hidden), // Only layout visible nodes
    edges: elkEdges.filter(edge => {
      const sourceNode = nodesToLayout.find(n => n.id === edge.source);
      const targetNode = nodesToLayout.find(n => n.id === edge.target);
      return !sourceNode?.hidden && !targetNode?.hidden;
    }),
  };

  try {
    const layoutedGraph = await elk.layout(graphToLayout);
    const updatedNodes = nodesToLayout.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (elkNode && typeof elkNode.x !== 'undefined' && typeof elkNode.y !== 'undefined') {
        return {
          ...node,
          position: { x: elkNode.x, y: elkNode.y },
        };
      }
      return node;
    });
    return { nodes: updatedNodes, edges: edgesToLayout };
  } catch (e) {
    console.error("ELK layout error:", e);
    return { nodes: nodesToLayout, edges: edgesToLayout }; // Return original on error
  }
};

// Custom collapsible node component
function CollapsibleNode({ id, data, isConnectable }: NodeProps<CollapsibleNodeData>) {
  // The `expanded` state for showing/hiding children will be managed by MindMapDisplay
  // This internal `expanded` can be used for things like showing/hiding node's own long description if needed in future
  // For now, the button primarily signals to the parent to toggle child visibility.
  const [descriptionExpanded, setDescriptionExpanded] = useState(data.expanded ?? true); 

  const nodeDimensions = {
    0: { width: 320, height: 110, fontSize: '20px', padding: '22px 26px' }, // Root
    1: { width: 300, height: 90, fontSize: '17px', padding: '18px 22px' }, // Themes
    2: { width: 280, height: 80, fontSize: '15px', padding: '14px 18px' }, // Sub-concepts
    3: { width: 240, height: 70, fontSize: '14px', padding: '12px 16px' }, // Details
  };
  const currentDimensions = nodeDimensions[data.level as keyof typeof nodeDimensions] || nodeDimensions[2];

  // Assign width and height to data for ELK
  data.width = currentDimensions.width;
  data.height = currentDimensions.height;

  const nodeStyleDefinition = {
    0: { background: 'linear-gradient(135deg, #004d66 0%, #006680 100%)', color: 'white', border: '3px solid #003d52', borderRadius: '16px', fontWeight: '700', boxShadow: '0 8px 20px rgba(0, 77, 102, 0.4)', textAlign: 'center' as const },
    1: { background: 'linear-gradient(135deg, #0080a3 0%, #00a6cc 100%)', color: 'white', border: '2px solid #006680', borderRadius: '12px', fontWeight: '600', boxShadow: '0 6px 16px rgba(0, 128, 163, 0.3)', textAlign: 'center' as const },
    2: { background: 'linear-gradient(135deg, #66b3cc 0%, #80ccdd 100%)', color: '#003d52', border: '2px solid #4d9fb8', borderRadius: '10px', fontWeight: '500', boxShadow: '0 4px 12px rgba(102, 179, 204, 0.3)', textAlign: 'center' as const },
    3: { background: 'linear-gradient(135deg, #ffcc66 0%, #ffdd99 100%)', color: '#003d52', border: '2px solid #ffb833', borderRadius: '8px', fontWeight: '400', boxShadow: '0 3px 8px rgba(255, 204, 102, 0.3)', textAlign: 'center' as const },
  };
  const currentStyle = nodeStyleDefinition[data.level as keyof typeof nodeStyleDefinition] || nodeStyleDefinition[2];

  return (
    <div style={{ ...currentStyle, width: currentDimensions.width, height: currentDimensions.height, padding: currentDimensions.padding, fontSize: currentDimensions.fontSize, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{background: '#888'}} />
      <div className="flex items-center justify-between gap-2 p-1 flex-grow">
        <div className="flex-1 overflow-hidden">
          <div className="font-semibold truncate" title={data.label}>{data.label}</div>
          {/* Description is always shown if present, but can be truncated if too long */}
          {data.description && (
            <div className="text-xs mt-1 opacity-90 whitespace-pre-wrap break-words" style={{fontSize: '0.8em'}}>{data.description}</div>
          )}
        </div>
        {data.childrenIds && data.childrenIds.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // This button click will be handled by a prop passed from MindMapDisplay
              // to toggle children visibility in the main graph state.
              // For now, let's assume a prop like data.onToggleExpansion(id) will be available.
              // This local setExpanded is just for the chevron for now.
              setDescriptionExpanded(!descriptionExpanded); 
              if ((data as any).onToggleExpansion) {
                (data as any).onToggleExpansion(id);
              }
            }}
            className="ml-2 p-1 hover:bg-white/20 rounded transition-colors self-center flex-shrink-0"
          >
            {/* The icon displayed (ChevronDown/ChevronRight) should reflect if children are visible */}
            {/* This will be driven by a prop like data.isGloballyExpanded */} 
            {(data as any).isGloballyExpanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{background: '#888'}} />
    </div>
  );
}

const nodeTypes = {
  // The actual onToggleExpansion function will be injected when rendering ReactFlow
  collapsible: CollapsibleNode 
};

interface MindMapDisplayProps {
  playlistTitle: string;
  playlistId: string; 
  keyConceptsFromSummary?: string[];
}

const generateAgenticAIMindMap = (keyConceptsFromSummary?: string[]): { nodes: Node<CollapsibleNodeData>[], edges: Edge[] } => {
  const nodes: Node<CollapsibleNodeData>[] = [
    { id: '1', type: 'collapsible', data: { label: 'Agentic AI', description: 'AI systems capable of autonomous decision-making and goal achievement.', expanded: true, childrenIds: ['2', '3', '4', '5'], level: 0 }, position: { x: 0, y: 0 } },
    { id: '2', type: 'collapsible', data: { label: 'Theme 1: Defining Agentic AI', expanded: true, childrenIds: ['6', '7', '8'], level: 1 }, position: { x: 0, y: 0 } },
    { id: '3', type: 'collapsible', data: { label: 'Theme 2: Capabilities & Distinctions', expanded: true, childrenIds: ['9', '10', '11'], level: 1 }, position: { x: 0, y: 0 } },
    { id: '4', type: 'collapsible', data: { label: 'Theme 3: Applications', expanded: true, childrenIds: ['12', '13'], level: 1 }, position: { x: 0, y: 0 } },
    { id: '5', type: 'collapsible', data: { label: 'Theme 4: Implementation', expanded: true, childrenIds: ['14', '15'], level: 1 }, position: { x: 0, y: 0 } },
    { id: '6', type: 'collapsible', data: { label: 'Autonomous Goal Achievement', description: 'Multi-step planning, no explicit instructions.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '7', type: 'collapsible', data: { label: 'Decision-Making Process', description: 'Access to tools, contextual memory.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '8', type: 'collapsible', data: { label: 'Autonomous Reasoning', description: 'Independent problem-solving.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '9', type: 'collapsible', data: { label: 'vs. RAG Systems', description: 'Beyond simple retrieval/generation.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '10', type: 'collapsible', data: { label: 'vs. Tool-Augmented Chatbots', description: 'More than reactive Q&A.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '11', type: 'collapsible', data: { label: 'LLM as Component', description: 'Integrated with other tools/knowledge.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '12', type: 'collapsible', data: { label: 'Real-World Examples', description: 'Coding assistants, travel, research.', childrenIds: ['16','17'], level: 2 }, position: { x: 0, y: 0 } },
    { id: '13', type: 'collapsible', data: { label: 'Business Use Cases', description: 'Complex scenario handling & automation.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '14', type: 'collapsible', data: { label: 'Code Demonstrations', description: 'Practical implementation insights.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '15', type: 'collapsible', data: { label: 'Framework Integration', description: 'Leveraging AGNO, Zapier, n8n.', level: 2 }, position: { x: 0, y: 0 } },
    { id: '16', type: 'collapsible', data: { label: 'Replit / Lobe (Coding)', level: 3 }, position: { x: 0, y: 0 } },
    { id: '17', type: 'collapsible', data: { label: 'Intelligent Travel Assistants', level: 3 }, position: { x: 0, y: 0 } },
  ];
  const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#0080a3', strokeWidth: 3, strokeDasharray: '5,5'} },
    { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#0080a3', strokeWidth: 3, strokeDasharray: '5,5' } },
    { id: 'e1-4', source: '1', target: '4', animated: true, style: { stroke: '#0080a3', strokeWidth: 3, strokeDasharray: '5,5' } },
    { id: 'e1-5', source: '1', target: '5', animated: true, style: { stroke: '#0080a3', strokeWidth: 3, strokeDasharray: '5,5' } },
    { id: 'e2-6', source: '2', target: '6', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e2-7', source: '2', target: '7', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e2-8', source: '2', target: '8', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e3-9', source: '3', target: '9', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e3-10', source: '3', target: '10', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e3-11', source: '3', target: '11', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e4-12', source: '4', target: '12', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e4-13', source: '4', target: '13', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e5-14', source: '5', target: '14', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e5-15', source: '5', target: '15', style: { stroke: '#66b3cc', strokeWidth: 2.5 } },
    { id: 'e12-16', source: '12', target: '16', style: { stroke: '#ffdd99', strokeWidth: 2 } }, // Lighter yellow for details
    { id: 'e12-17', source: '12', target: '17', style: { stroke: '#ffdd99', strokeWidth: 2 } },
  ];
  if (keyConceptsFromSummary && keyConceptsFromSummary.length > 0) {
    keyConceptsFromSummary.slice(0,3).forEach((concept, index) => {
      const dynamicNodeId = `dynamic-concept-${index}`;
      nodes.push({
        id: dynamicNodeId,
        type: 'collapsible',
        data: { label: concept, level: 2 }, 
        position: { x: 0, y: 0 }, 
      });
      initialEdges.push({
        id: `e1-${dynamicNodeId}`,
        source: '1', 
        target: dynamicNodeId,
        animated: true,
        style: { stroke: '#00a6cc', strokeWidth: 2, strokeDasharray: '5,5' }
      });
      const parentNode = nodes.find(n => n.id === '1');
      if (parentNode?.data.childrenIds) parentNode.data.childrenIds.push(dynamicNodeId);
      else if (parentNode) parentNode.data.childrenIds = [dynamicNodeId];
    });
  }
  return { nodes, edges: initialEdges };
};

export function MindMapDisplay({ playlistTitle, playlistId, keyConceptsFromSummary }: MindMapDisplayProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();
  
  const [allNodes, setAllNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [displayedNodes, setDisplayedNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [displayedEdges, setDisplayedEdges] = useState<Edge[]>([]);
  
  // Start with no nodes expanded, root will be added by getVisibleNodesAndEdges if needed
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set(['1'])); 

  const [isLoading, setIsLoading] = useState(true);
  const [generatedTitle, setGeneratedTitle] = useState('Generating Mind Map...');
  const [lastInteractedNodeId, setLastInteractedNodeId] = useState<string | null>(null); // Initially no interaction

  const mindMapContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<any>(null);

  const setRfInstance = (instance: any) => {
    rfInstanceRef.current = instance;
  };

  const handleToggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
        const nodesToCollapse = [nodeId];
        let currentIdx = 0;
        while(currentIdx < nodesToCollapse.length) {
          const currentNodeId = nodesToCollapse[currentIdx++];
          const node = allNodes.find(n => n.id === currentNodeId);
          if (node && node.data.childrenIds) {
            node.data.childrenIds.forEach(childId => {
              if (newSet.has(childId)) {
                newSet.delete(childId);
                nodesToCollapse.push(childId);
              }
            });
          }
        }
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    setLastInteractedNodeId(nodeId); // Update last interacted node for focusing
  }, [allNodes]);

  const getVisibleNodesAndEdges = useCallback(() => {
    if (allNodes.length === 0) {
      return { visibleNodes: [], visibleEdges: [] };
    }

    const visibleNodesAccumulator: Node<CollapsibleNodeData>[] = [];
    const nodesToProcess = new Set<string>();

    // Always ensure the root node (id: '1') is a candidate for visibility checks
    // Its children will only be processed if '1' is in expandedNodeIds
    function findVisibleRecursive(nodeId: string) {
      if (nodesToProcess.has(nodeId)) return; // Already added or scheduled
      nodesToProcess.add(nodeId);

      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;

      // Add the node itself to visible list (root is always added here first)
      visibleNodesAccumulator.push({
        ...node,
        data: {
          ...node.data,
          onToggleExpansion: handleToggleNodeExpansion,
          isGloballyExpanded: expandedNodeIds.has(node.id)
        }
      });

      // If this node is expanded, recursively process its children
      if (expandedNodeIds.has(nodeId) && node.data.childrenIds) {
        node.data.childrenIds.forEach(childId => {
          findVisibleRecursive(childId);
        });
      }
    }

    // Start traversal from the root node. If root is not expanded, only root will be in visibleNodesAccumulator.
    findVisibleRecursive('1'); 
    
    const visibleNodeIds = new Set(visibleNodesAccumulator.map(n => n.id));
    const visibleEdges = allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    return { visibleNodes: visibleNodesAccumulator, visibleEdges };
  }, [allNodes, allEdges, expandedNodeIds, handleToggleNodeExpansion]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setDisplayedNodes((nds) => applyNodeChanges(changes, nds)),
    [setDisplayedNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setDisplayedEdges((eds) => applyEdgeChanges(changes, eds)),
    [setDisplayedEdges]
  );

  const loadMindMapData = useCallback(async () => {
    setIsLoading(true);
    setGeneratedTitle("Crafting Agentic AI Mind Map...");
    try {
      const { nodes: generatedNodes, edges: generatedEdges } = generateAgenticAIMindMap(keyConceptsFromSummary);
      setAllNodes(generatedNodes);
      setAllEdges(generatedEdges);
      
      // Initial expansion state is already set to root node '1'
      // The useEffect listening to expandedNodeIds will trigger the first layout

      setGeneratedTitle("Agentic AI: Capabilities and Distinctions");
        toast({ 
        title: "Mind Map Structure Ready! 🧠", 
        description: "Initial mind map structure loaded. Performing layout..." 
      });
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      setGeneratedTitle("Error Loading Mind Map");
      toast({
        title: "Mind Map Error",
        description: "Could not generate the mind map with ELK.",
        variant: "destructive",
      });
    } finally {
      // setIsLoading(false); //isLoading will be false after layout in the useEffect
    }
  }, [keyConceptsFromSummary, toast]);

  useEffect(() => {
    loadMindMapData();
  }, [loadMindMapData]);

  // Effect to update layout when visible nodes/edges change (due to expansion)
  useEffect(() => {
    const performLayout = async () => {
      if (allNodes.length === 0) return;
      setIsLoading(true);
      const { visibleNodes, visibleEdges } = getVisibleNodesAndEdges();
      
      if (visibleNodes.length > 0) {
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(visibleNodes, visibleEdges, elkLayoutOptions);
        setDisplayedNodes(layoutedNodes);
        setDisplayedEdges(layoutedEdges);
        
        setTimeout(() => {
          if (rfInstanceRef.current) {
            let focusIds: string[] = [];
            let padding = 0.25; // Default padding for most focused views

            // Scenario 1: Initial load, only root node is visible (because expandedNodeIds is empty)
            if (layoutedNodes.length === 1 && layoutedNodes[0]?.id === '1' && expandedNodeIds.size === 0) {
              focusIds = ['1'];
              padding = 0.8; // Very spacious padding for a single root node overview
            } 
            // Scenario 2: User has interacted, and we have a lastInteractedNodeId
            else if (lastInteractedNodeId) {
              const interactedNodeInLayout = layoutedNodes.find(n => n.id === lastInteractedNodeId);
              
              if (interactedNodeInLayout) {
                focusIds.push(lastInteractedNodeId); 
                const isInteractedNodeExpanded = expandedNodeIds.has(lastInteractedNodeId);

                if (isInteractedNodeExpanded && interactedNodeInLayout.data.childrenIds) {
                  interactedNodeInLayout.data.childrenIds.forEach(childId => {
                    if (layoutedNodes.some(ln => ln.id === childId)) { 
                      focusIds.push(childId);
                    }
                  });
                }
                
                if (focusIds.length > 1) { // Parent + children visible
                   padding = 0.2;
                } else { // Single node focus (either collapsed or no children)
                   padding = 0.4;
                }
              } else {
                // Fallback if interacted node isn't in layout (should be rare)
                // Do nothing, let the general fallback below handle it or keep current view
              }
            }

            // Apply fitView based on calculated focusIds and padding
            if (focusIds.length > 0) {
              rfInstanceRef.current.fitView({
                nodes: focusIds.map(id => ({ id })),
                padding: padding,
                duration: 600
              });
            } else if (layoutedNodes.length > 0) { // General fallback if no specific focus determined
              rfInstanceRef.current.fitView({ padding: 0.25, duration: 600 });
            }
            // No need to setLastInteractedNodeId(null) here, keep it for context
          }
        }, 100);
      } else {
        setDisplayedNodes([]);
        setDisplayedEdges([]);
      }
      setIsLoading(false);
    };

    performLayout();
  }, [allNodes, allEdges, expandedNodeIds, getVisibleNodesAndEdges]); // Add getVisibleNodesAndEdges

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
      const html2canvas = (await import('html2canvas')).default;
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(container, {
        backgroundColor: '#18181b', // Consistent dark background
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        logging: false,
        width: container.offsetWidth,
        height: container.offsetHeight,
        ignoreElements: (element) => {
          return element.classList.contains('react-flow__controls') || 
                 element.classList.contains('react-flow__minimap') ||
                 element.classList.contains('react-flow__attribution');
        },
        onclone: (clonedDoc, element) => {
          const clonedContainer = clonedDoc.querySelector('.react-flow') || element;
          if (clonedContainer) {
            (clonedContainer as HTMLElement).style.backgroundColor = '#18181b !important';
            // Apply styles for better PNG export visibility if needed
          }
        }
      });
      const link = document.createElement('a');
      link.download = `${(generatedTitle || 'mindmap').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase()}_mindmap.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "Mind Map Downloaded! 📥", description: "High-quality PNG saved." });
    } catch (error) {
      console.error('Error downloading PNG:', error);
      downloadAsSVG(containerRef);
      toast({ title: "PNG Export Failed", description: "Downloaded as SVG instead.", variant: "default" });
    }
  };
  
  const renderReactFlowContent = (isFullScreenContext: boolean) => {
    return (
      <div 
        className={`relative bg-[#18181b] ${
          isFullScreenContext 
            ? 'h-full w-full' 
            : 'h-[650px] w-full' // Increased default height
        }`}
      >
        {(isLoading && displayedNodes.length === 0) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <BrainIcon className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="mt-6 text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">Generating Mind Map...</h3>
              <p className="text-sm text-gray-300 max-w-md">
                Structuring Agentic AI concepts with ELK layout...
              </p>
            </div>
         </div>
      ) : (
        <ReactFlow
          nodes={displayedNodes}
          edges={displayedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={setRfInstance}
          fitView
          fitViewOptions={{ padding: 0.2, duration: 800, maxZoom: 1.2 }}
          minZoom={0.05}
          maxZoom={2.5}
          className="bg-[#18181b]"
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
            gap={28} 
            size={1.2}
            color="#3a3a3a" 
            className="opacity-60"
            />
            <Controls 
            className={`${isFullScreenContext ? 'block' : 'hidden'} bg-neutral-800/90 backdrop-blur-sm border border-neutral-700 rounded-lg`}
            showInteractive={false}
            />
            <MiniMap 
            className={`${isFullScreenContext ? 'block' : 'hidden'} bg-neutral-800/90 backdrop-blur-sm border border-neutral-700 rounded-lg`}
            nodeColor={(node) => {
              const level = (node.data as CollapsibleNodeData).level || 0;
              const nodeStylesForMiniMap = {
                  0: '#006680', 1: '#00a6cc', 2: '#80ccdd', 3: '#ffdd99',
              };
              return nodeStylesForMiniMap[level as keyof typeof nodeStylesForMiniMap] || '#80ccdd';
            }}
            nodeStrokeWidth={3}
            maskColor="rgba(100, 100, 100, 0.15)"
            pannable zoomable
            />
        </ReactFlow>
      )}
    </div>
  );
  };

  return (
    <Card className="w-full h-full min-h-[750px] shadow-xl border-2 border-primary/20 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
      <CardHeader className="border-b border-neutral-800 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BrainIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">
                Mind Map: {generatedTitle}
            </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {isLoading && displayedNodes.length === 0 ? 'AI is structuring your mind map...' : 'Interactive Mind Map - Agentic AI Concepts'}
              </CardDescription>
            </div>
        </div>
          
          {!isLoading && displayedNodes.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => downloadAsSVG(mindMapContainerRef)} className="text-white hover:bg-primary/20 border-primary/40">
                <DownloadIcon className="h-4 w-4 mr-2" />SVG
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadAsPNG(mindMapContainerRef)} className="text-white hover:bg-primary/20 border-primary/40">
                <DownloadIcon className="h-4 w-4 mr-2" />PNG
          </Button>
          <Dialog open={isFullScreenOpen} onOpenChange={setIsFullScreenOpen}>
            <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-white hover:bg-primary/20 border-primary/40">
                    <MaximizeIcon className="h-4 w-4 mr-2" />Fullscreen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-none w-[95vw] h-[90vh] flex flex-col p-0 bg-neutral-900 border-primary/30">
                  <DialogHeader className="p-4 border-b border-neutral-700 flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center truncate text-white">
                      <BrainIcon className="h-6 w-6 mr-2 text-primary shrink-0" /><span className="truncate">Mind Map: {generatedTitle}</span>
                    </DialogTitle>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white"><XIcon className="h-5 w-5" /></Button></DialogClose>
              </DialogHeader>
                  <div className="flex-grow p-2 overflow-hidden" ref={fullScreenContainerRef}>
                {renderReactFlowContent(true)}
              </div>
            </DialogContent>
          </Dialog>
              <Button variant="outline" size="sm" onClick={loadMindMapData} className="text-white hover:bg-accent/20 border-accent/40">
                <RefreshCwIcon className="h-4 w-4 mr-2" />Regenerate
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

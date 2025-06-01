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
  // Dynamic properties added at runtime
  onToggleExpansion?: (nodeId: string) => void;
  isGloballyExpanded?: boolean;
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
      const sourceNode = nodesToLayout.find(n => n.id === edge.sources[0]);
      const targetNode = nodesToLayout.find(n => n.id === edge.targets[0]);
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
  // The `expanded` state for showing/hiding children is managed by MindMapDisplay
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
              // Call the onToggleExpansion function passed from the parent
              if ((data as any).onToggleExpansion) {
                (data as any).onToggleExpansion(id);
              }
            }}
            className="ml-2 p-2 hover:bg-white/30 rounded-full transition-colors self-center flex-shrink-0 border border-white/20 hover:border-white/40"
            title={`${(data as any).isGloballyExpanded ? 'Collapse' : 'Expand'} children`}
          >
            {/* The icon displayed (ChevronDown/ChevronRight) should reflect if children are visible */}
            {/* This will be driven by a prop like data.isGloballyExpanded */} 
            {(data as any).isGloballyExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
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
  enhancedSummaryData?: any;
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

const generateDynamicMindMap = (playlistTitle: string, enhancedSummaryData?: any): { nodes: Node<CollapsibleNodeData>[], edges: Edge[] } => {
  // DEBUG: Log function call and parameters
  console.log('🎯 [generateDynamicMindMap] Called with:', {
    playlistTitle,
    hasEnhancedData: !!enhancedSummaryData,
    enhancedSummaryData: enhancedSummaryData,
    hasMultimodalData: !!(enhancedSummaryData?.multimodal_data)
  });

  // If no enhanced data is available, return empty structure - no placeholder nodes
  if (!enhancedSummaryData || !enhancedSummaryData.multimodal_data) {
    console.log('⚠️ [generateDynamicMindMap] No enhanced data - returning empty structure');
    return { nodes: [], edges: [] };
  }

  const multiModalData = enhancedSummaryData.multimodal_data;
  const rootTopic = multiModalData.ROOT_TOPIC || playlistTitle || 'Video Analysis';
  const keyConcepts = multiModalData.key_concepts || multiModalData.KEY_CONCEPTS || [];
  const keyTopics = multiModalData.key_topics || [];
  const learningObjectives = multiModalData.learning_objectives || [];
  const visualInsights = multiModalData.visual_insights || [];
  const timestampHighlights = multiModalData.timestamp_highlights || [];
  const terminologies = multiModalData.terminologies || [];

  const nodes: Node<CollapsibleNodeData>[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 1;

  // Helper function to create detailed sub-nodes from text content
  const createDetailedSubNodes = (parentContent: any, parentId: string, startLevel: number): { childIds: string[], maxLevel: number } => {
    const childIds: string[] = [];
    let currentLevel = startLevel;
    let maxLevel = startLevel;

    if (typeof parentContent === 'string') {
      // Break down string content into detailed components
      const sentences = parentContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      sentences.slice(0, 4).forEach((sentence, index) => {
        const detailNodeId = nodeIdCounter.toString();
        const cleanSentence = sentence.trim();
        
        if (cleanSentence.length > 5) {
          nodes.push({
            id: detailNodeId,
            type: 'collapsible',
            data: {
              label: cleanSentence.length > 50 ? cleanSentence.substring(0, 47) + '...' : cleanSentence,
              description: cleanSentence.length > 50 ? cleanSentence : undefined,
              childrenIds: [],
              level: currentLevel + 1
            },
            position: { x: 0, y: 0 }
          });

          childIds.push(detailNodeId);
          maxLevel = Math.max(maxLevel, currentLevel + 1);

          edges.push({
            id: `e${parentId}-${detailNodeId}`,
            source: parentId,
            target: detailNodeId,
            style: { stroke: '#ffdd99', strokeWidth: 2 }
          });

          nodeIdCounter++;

          // Create even deeper level if sentence has multiple clauses
          const clauses = cleanSentence.split(/[,;:]/).filter(c => c.trim().length > 8);
          if (clauses.length > 1 && currentLevel < 5) { // Limit depth to prevent infinite recursion
            const subChildIds: string[] = [];
            
            clauses.slice(0, 3).forEach((clause, clauseIndex) => {
              const clauseNodeId = nodeIdCounter.toString();
              const cleanClause = clause.trim();
              
              if (cleanClause.length > 8) {
                nodes.push({
                  id: clauseNodeId,
                  type: 'collapsible',
                  data: {
                    label: cleanClause.length > 40 ? cleanClause.substring(0, 37) + '...' : cleanClause,
                    description: cleanClause.length > 40 ? cleanClause : undefined,
                    level: currentLevel + 2
                  },
                  position: { x: 0, y: 0 }
                });

                subChildIds.push(clauseNodeId);
                maxLevel = Math.max(maxLevel, currentLevel + 2);

                edges.push({
                  id: `e${detailNodeId}-${clauseNodeId}`,
                  source: detailNodeId,
                  target: clauseNodeId,
                  style: { stroke: '#ffe6cc', strokeWidth: 1.5 }
                });

                nodeIdCounter++;
              }
            });

            // Update parent node with children
            const parentNode = nodes.find(n => n.id === detailNodeId);
            if (parentNode && subChildIds.length > 0) {
              parentNode.data.childrenIds = subChildIds;
            }
          }
        }
      });
    } else if (Array.isArray(parentContent)) {
      // Handle arrays by creating sub-categories
      parentContent.slice(0, 6).forEach((item, index) => {
        const subResult = createDetailedSubNodes(item, parentId, currentLevel);
        childIds.push(...subResult.childIds);
        maxLevel = Math.max(maxLevel, subResult.maxLevel);
      });
    } else if (typeof parentContent === 'object' && parentContent !== null) {
      // Handle objects by creating nodes for each property
      Object.entries(parentContent).slice(0, 5).forEach(([key, value]) => {
        const objNodeId = nodeIdCounter.toString();
        
        nodes.push({
          id: objNodeId,
          type: 'collapsible',
          data: {
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: typeof value === 'string' ? value.substring(0, 100) : String(value).substring(0, 100),
            childrenIds: [],
            level: currentLevel + 1
          },
          position: { x: 0, y: 0 }
        });

        childIds.push(objNodeId);
        maxLevel = Math.max(maxLevel, currentLevel + 1);

        edges.push({
          id: `e${parentId}-${objNodeId}`,
          source: parentId,
          target: objNodeId,
          style: { stroke: '#b3d9ff', strokeWidth: 2 }
        });

        nodeIdCounter++;

        // Recursively create sub-nodes for this object property
        if (typeof value === 'string' || Array.isArray(value)) {
          const subResult = createDetailedSubNodes(value, objNodeId, currentLevel + 1);
          const objNode = nodes.find(n => n.id === objNodeId);
          if (objNode) {
            objNode.data.childrenIds = subResult.childIds;
          }
          maxLevel = Math.max(maxLevel, subResult.maxLevel);
        }
      });
    }

    return { childIds, maxLevel };
  };

  // Root node
  const rootNodeId = nodeIdCounter.toString();
  nodes.push({
    id: rootNodeId,
    type: 'collapsible',
    data: {
      label: rootTopic,
      description: 'AI-generated mind map based on comprehensive video content analysis.',
      expanded: true,
      childrenIds: [],
      level: 0
    },
    position: { x: 0, y: 0 }
  });
  nodeIdCounter++;

  // Create comprehensive theme categories with detailed breakdowns
  const comprehensiveCategories = [
    { title: 'Core Concepts', items: keyConcepts, color: '#0080a3', description: 'Fundamental ideas and principles' },
    { title: 'Key Topics', items: keyTopics, color: '#00a6cc', description: 'Main subject areas covered' },
    { title: 'Learning Objectives', items: learningObjectives, color: '#66b3cc', description: 'Educational goals and outcomes' },
    { title: 'Visual Elements', items: visualInsights, color: '#80ccdd', description: 'Important visual content and imagery' },
    { title: 'Timeline Highlights', items: timestampHighlights, color: '#99d6ea', description: 'Key moments and timestamps' },
    { title: 'Terminology', items: terminologies, color: '#b3e0f0', description: 'Important terms and definitions' }
  ].filter(category => category.items && category.items.length > 0);

  // If we have detailed summary, add it as a category too
  if (multiModalData.detailed_summary) {
    comprehensiveCategories.unshift({
      title: 'Detailed Analysis',
      items: [multiModalData.detailed_summary],
      color: '#004d66',
      description: 'Comprehensive content breakdown'
    });
  }

  comprehensiveCategories.forEach((category, categoryIndex) => {
    const themeNodeId = nodeIdCounter.toString();
    nodes.push({
      id: themeNodeId,
      type: 'collapsible',
      data: {
        label: category.title,
        description: category.description,
        expanded: true,
        childrenIds: [],
        level: 1
      },
      position: { x: 0, y: 0 }
    });

    // Add to root node's children
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (rootNode?.data.childrenIds) {
      rootNode.data.childrenIds.push(themeNodeId);
    }

    // Create edge from root to theme
    edges.push({
      id: `e${rootNodeId}-${themeNodeId}`,
      source: rootNodeId,
      target: themeNodeId,
      animated: true,
      style: { stroke: category.color, strokeWidth: 3, strokeDasharray: '5,5' }
    });

    nodeIdCounter++;

    // Create detailed concept nodes under this theme with infinite levels
    const themeChildIds: string[] = [];
    category.items.slice(0, 8).forEach((item: any, itemIndex: number) => {
      const conceptNodeId = nodeIdCounter.toString();
      const itemLabel = typeof item === 'string' ? item : 
                       typeof item === 'object' && item?.title ? item.title :
                       typeof item === 'object' && item?.text ? item.text :
                       String(item);

      nodes.push({
        id: conceptNodeId,
        type: 'collapsible',
        data: {
          label: itemLabel.length > 60 ? itemLabel.substring(0, 57) + '...' : itemLabel,
          description: typeof item === 'object' && item?.description ? item.description : 
                      itemLabel.length > 60 ? itemLabel : undefined,
          childrenIds: [],
          level: 2
        },
        position: { x: 0, y: 0 }
      });

      themeChildIds.push(conceptNodeId);

      // Create edge from theme to concept
      edges.push({
        id: `e${themeNodeId}-${conceptNodeId}`,
        source: themeNodeId,
        target: conceptNodeId,
        style: { stroke: '#66b3cc', strokeWidth: 2.5 }
      });

      nodeIdCounter++;

      // Create detailed sub-nodes for this concept (infinite levels)
      const detailResult = createDetailedSubNodes(item, conceptNodeId, 2);
      const conceptNode = nodes.find(n => n.id === conceptNodeId);
      if (conceptNode) {
        conceptNode.data.childrenIds = detailResult.childIds;
      }
    });

    // Update theme node with its children
    const themeNode = nodes.find(n => n.id === themeNodeId);
    if (themeNode) {
      themeNode.data.childrenIds = themeChildIds;
    }
  });

  // Add a comprehensive insights node if we have enough data
  if (nodes.length > 10) {
    const insightsNodeId = nodeIdCounter.toString();
    nodes.push({
      id: insightsNodeId,
      type: 'collapsible',
      data: {
        label: 'Deep Insights & Connections',
        description: 'Advanced analysis connecting different concepts and themes',
        expanded: true,
        childrenIds: [],
        level: 1
      },
      position: { x: 0, y: 0 }
    });

    // Add to root
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (rootNode?.data.childrenIds) {
      rootNode.data.childrenIds.push(insightsNodeId);
    }

    edges.push({
      id: `e${rootNodeId}-${insightsNodeId}`,
      source: rootNodeId,
      target: insightsNodeId,
      animated: true,
      style: { stroke: '#ff9999', strokeWidth: 3, strokeDasharray: '5,5' }
    });

    nodeIdCounter++;

    // Create cross-connections and relationships
    const insightChildIds: string[] = [];
    
    // Connection insights
    ['Concept Relationships', 'Learning Pathways', 'Practical Applications', 'Advanced Topics'].forEach((insightType, index) => {
      const insightDetailId = nodeIdCounter.toString();
      nodes.push({
        id: insightDetailId,
        type: 'collapsible',
        data: {
          label: insightType,
          description: `Exploring ${insightType.toLowerCase()} within the video content`,
          level: 2
        },
        position: { x: 0, y: 0 }
      });

      insightChildIds.push(insightDetailId);

      edges.push({
        id: `e${insightsNodeId}-${insightDetailId}`,
        source: insightsNodeId,
        target: insightDetailId,
        style: { stroke: '#ffb3b3', strokeWidth: 2 }
      });

      nodeIdCounter++;
    });

    // Update insights node with children
    const insightsNode = nodes.find(n => n.id === insightsNodeId);
    if (insightsNode) {
      insightsNode.data.childrenIds = insightChildIds;
    }
  }

  console.log(`🌳 [generateDynamicMindMap] Generated ${nodes.length} nodes with multiple levels of detail`);
  return { nodes, edges };
};

export function MindMapDisplay({ playlistTitle, playlistId, keyConceptsFromSummary, enhancedSummaryData }: MindMapDisplayProps) {
  // DEBUG: Log component renders and props
  console.log('🖼️ [MindMapDisplay] Rendering with props:', {
    playlistTitle,
    playlistId,
    hasEnhancedSummaryData: !!enhancedSummaryData,
    enhancedSummaryData
  });

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();
  
  const [allNodes, setAllNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [displayedNodes, setDisplayedNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [displayedEdges, setDisplayedEdges] = useState<Edge[]>([]);
  
  // Start with no nodes expanded, root will be added by getVisibleNodesAndEdges if needed
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set()); 

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

    // Find the actual root node (level 0) instead of hardcoding '1'
    const rootNode = allNodes.find(node => node.data.level === 0);
    if (!rootNode) {
      return { visibleNodes: [], visibleEdges: [] };
    }

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

    // Start traversal from the actual root node
    findVisibleRecursive(rootNode.id); 
    
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
    
    // Set dynamic title based on available data
    const dynamicTitle = enhancedSummaryData?.multimodal_data?.ROOT_TOPIC || playlistTitle || 'Mind Map';
    setGeneratedTitle(`Generating ${dynamicTitle} Mind Map...`);
    
    // DEBUG: Log enhancedSummaryData to trace data flow
    console.log('🔍 [loadMindMapData] enhancedSummaryData:', enhancedSummaryData);
    console.log('🔍 [loadMindMapData] multimodal_data:', enhancedSummaryData?.multimodal_data);
    console.log('🔍 [loadMindMapData] playlistTitle:', playlistTitle);
    
    try {
      const { nodes: generatedNodes, edges: generatedEdges } = generateDynamicMindMap(playlistTitle, enhancedSummaryData);
      
      // Find the root node and set it as initially expanded BEFORE setting nodes
      const rootNode = generatedNodes.find(node => node.data.level === 0);
      if (rootNode) {
        setExpandedNodeIds(new Set([rootNode.id]));
      }
      
      setAllNodes(generatedNodes);
      setAllEdges(generatedEdges);

      setGeneratedTitle(dynamicTitle);
        toast({ 
        title: "Mind Map Structure Ready! 🧠", 
        description: enhancedSummaryData ? "AI-generated mind map structure loaded. Performing layout..." : "Basic mind map structure loaded. Start AI analysis for enhanced content." 
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
  }, [playlistTitle, enhancedSummaryData, toast]);

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

            // Find the actual root node
            const rootNode = layoutedNodes.find(node => node.data.level === 0);
            const rootNodeId = rootNode?.id;

            // Scenario 1: Initial load, only root node is visible (because expandedNodeIds is empty or has only root)
            if (layoutedNodes.length === 1 && rootNodeId && layoutedNodes[0]?.id === rootNodeId && expandedNodeIds.size <= 1) {
              focusIds = [rootNodeId];
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
                {enhancedSummaryData ? 'Structuring AI-analyzed content with ELK layout...' : 'Preparing mind map structure...'}
              </p>
            </div>
         </div>
      ) : displayedNodes.length === 0 ? (
        // Show "Start Analysis" message when no nodes are available
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative mx-auto">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <BrainIcon className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <AlertCircleIcon className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">AI Mind Map Ready</h3>
              <p className="text-muted-foreground leading-relaxed">
                Click <span className="font-medium text-primary">"Start AI Analysis"</span> above to generate an intelligent mind map based on the video content.
              </p>
              <div className="text-xs text-muted-foreground/80 space-y-1">
                <p>✨ AI will analyze video transcript and visual content</p>
                <p>🧠 Generate key concepts and learning objectives</p>
                <p>🗺️ Create an interactive knowledge map</p>
              </div>
            </div>
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
                {isLoading && displayedNodes.length === 0 ? 'AI is structuring your mind map...' : displayedNodes.length === 0 ? 'Click "Start AI Analysis" above to generate your mind map' : enhancedSummaryData ? 'Interactive AI-Generated Mind Map' : 'Interactive Mind Map - Start AI Analysis for Dynamic Content'}
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

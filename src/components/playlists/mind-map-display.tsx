'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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
  MarkerType,
  getBezierPath,
  type EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Elk, { type ElkNode, type ElkExtendedEdge, type LayoutOptions } from 'elkjs/lib/elk.bundled.js';

// Phase 4.1: Enhanced Visual Styling - Focus-Based CSS Classes
const focusStyles = `
  /* Focus-based node styling */
  .node-container.focused {
    transform: scale(1.05) !important;
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4), 0 4px 16px rgba(59, 130, 246, 0.3) !important;
    border: 2px solid #4F46E5 !important;
    z-index: 10 !important;
  }

  .node-container.in-focus-path {
    opacity: 1 !important;
    transform: scale(1.02) !important;
  }

  .node-container:not(.in-focus-path):not(.focused) {
    opacity: 0.6 !important;
    filter: grayscale(0.3) !important;
  }

  .node-container {
    transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
    cursor: pointer !important;
  }

  .node-container:hover:not(.focused) {
    transform: scale(1.03) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  }

  /* Smooth edge transitions */
  .react-flow__edge {
    transition: opacity 0.4s ease !important;
  }

  .react-flow__edge.dimmed {
    opacity: 0.3 !important;
  }

  /* Enhanced focus path highlighting */
  .node-container.in-focus-path:not(.focused) {
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.4), 0 6px 20px rgba(0, 0, 0, 0.15) !important;
  }

  /* Smooth transitions for all interactive elements */
  .expand-button {
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
  }

  /* Enhanced hover states */
  .node-container:hover .expand-button {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: scale(1.1) !important;
  }

  /* Better visual hierarchy for different focus states */
  .node-container.focused .expand-button {
    border-color: rgba(255, 255, 255, 0.6) !important;
    background: rgba(255, 255, 255, 0.15) !important;
  }

  /* Enhanced focus transitions */
  .node-container.focused {
    animation: focusPulse 0.6s ease-out;
  }

  @keyframes focusPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
    }
    50% {
      transform: scale(1.08);
      box-shadow: 0 8px 25px rgba(79, 70, 229, 0.6), 0 0 0 4px rgba(79, 70, 229, 0.2);
    }
    100% {
      transform: scale(1.05);
      box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4), 0 4px 16px rgba(59, 130, 246, 0.3);
    }
  }

  /* Enhanced edge focus styling */
  .react-flow__edge.focus-edge path {
    stroke-width: 3px !important;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) !important;
  }

  /* Smooth dimming transition for non-focused elements */
  .react-flow__edge.dimmed path {
    stroke-opacity: 0.3 !important;
    stroke-width: 1.5px !important;
  }

  /* Enhanced interaction feedback */
  .node-container:active {
    transform: scale(0.98) !important;
  }

  .node-container.focused:active {
    transform: scale(1.03) !important;
  }

  /* Phase 6.1: Breadcrumb Navigation Styles */
  .breadcrumb-nav {
    max-width: 300px;
  }

  .breadcrumb-button {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .breadcrumb-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .breadcrumb-button:active {
    transform: translateY(0);
  }

  .separator {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }

  /* Compact breadcrumb mode */
  .breadcrumb-nav.compact {
    max-width: 200px;
  }

  .breadcrumb-nav.compact .breadcrumb-button {
    padding: 2px 6px;
    font-size: 10px;
    max-width: 80px;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = focusStyles;
  if (!document.head.querySelector('#mind-map-focus-styles')) {
    styleElement.id = 'mind-map-focus-styles';
    document.head.appendChild(styleElement);
  }
}

// Phase 4.2: Custom Edge Component for Curved Lines
const CustomCurvedEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3, // Smooth curved lines for NotebookLM aesthetic
  });

  // Enhanced focus-based styling
  const isInFocusPath = data?.isInFocusPath || false;
  const isFocused = data?.isFocused || false;
  
  // Dynamic styling based on focus state
  let strokeColor = '#6B7280'; // Default gray
  let strokeWidth = 2;
  let opacity = 1;
  
  if (isFocused) {
    strokeColor = '#4F46E5'; // Indigo for focused
    strokeWidth = 4;
    opacity = 1;
  } else if (isInFocusPath) {
    strokeColor = '#059669'; // Emerald for focus path
    strokeWidth = 3;
    opacity = 0.9;
  } else {
    strokeColor = '#9CA3AF'; // Light gray for non-focused
    strokeWidth = 2;
    opacity = 0.4;
  }

  return (
    <>
      {/* Background path for glow effect on focused edges */}
      {(isFocused || isInFocusPath) && (
        <path
          d={edgePath}
          stroke={strokeColor}
          strokeWidth={strokeWidth + 2}
          fill="none"
          opacity={0.3}
          className="react-flow__edge-path-bg"
          style={{
            filter: 'blur(2px)',
            transition: 'all 0.4s ease'
          }}
        />
      )}
      
      {/* Main edge path */}
      <path
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        className="react-flow__edge-path"
        markerEnd={markerEnd}
        style={{
          transition: 'stroke 0.4s ease, stroke-width 0.4s ease, opacity 0.4s ease',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ...style
        }}
      />
    </>
  );
};

// Register the custom edge types
const edgeTypes = {
  curved: CustomCurvedEdge,
};

// Phase 6.1: Breadcrumb Navigation Component
interface BreadcrumbNavigationProps {
  history: string[];
  allNodes: Node<CollapsibleNodeData>[];
  focusedNodeId: string | null;
  onNavigate: (nodeId: string) => void;
  className?: string;
  compact?: boolean;
  maxItems?: number;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  history,
  allNodes,
  focusedNodeId,
  onNavigate,
  className = "",
  compact = false,
  maxItems = 5
}) => {
  if (history.length === 0) return null;

  // Smart truncation for long paths
  const displayHistory = history.length > maxItems 
    ? [...history.slice(0, 1), '...', ...history.slice(-maxItems + 2)]
    : history;

  return (
    <div className={`breadcrumb-nav ${className} ${compact ? 'compact' : ''}`}>
      {!compact && <div className="font-medium text-primary mb-2 text-xs">Focus Path</div>}
      <div className="flex items-center space-x-2 flex-wrap">
        {displayHistory.map((nodeId, index) => {
          // Handle ellipsis separator
          if (nodeId === '...') {
            return (
              <span key={`ellipsis-${index}`} className="text-neutral-500 text-xs">
                ...
              </span>
            );
          }
          
          const node = allNodes.find(n => n.id === nodeId);
          const isLast = index === displayHistory.length - 1;
          const isCurrent = nodeId === focusedNodeId;
          
          if (!node) return null;
          
          return (
            <React.Fragment key={nodeId}>
              <button
                onClick={() => onNavigate(nodeId)}
                className={`breadcrumb-button px-2 py-1 rounded text-xs transition-all duration-200 ${
                  isCurrent 
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                    : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white hover:scale-105'
                }`}
                title={node.data.label}
                aria-label={`Navigate to ${node.data.label}`}
              >
                <span className={`truncate block ${compact ? 'max-w-[80px]' : 'max-w-[120px]'}`}>
                  {compact && node.data.label.length > 10 
                    ? `${node.data.label.substring(0, 10)}...`
                    : node.data.label.length > 15 
                    ? `${node.data.label.substring(0, 15)}...` 
                    : node.data.label
                  }
                </span>
              </button>
              {!isLast && (
                <ChevronRightIcon 
                  className="h-3 w-3 text-neutral-500 separator flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Quick actions for breadcrumb navigation */}
      {!compact && (
        <div className="mt-2 pt-2 border-t border-neutral-600 flex items-center justify-between text-xs">
          <span className="text-neutral-400">
            {history.length} step{history.length !== 1 ? 's' : ''} in path
          </span>
          <div className="flex items-center space-x-2">
            {history.length > maxItems && (
              <button
                onClick={() => onNavigate(history[Math.floor(history.length / 2)])}
                className="text-neutral-400 hover:text-white transition-colors"
                title="Go to middle node"
                aria-label="Navigate to middle node"
              >
                ↕ Mid
              </button>
            )}
            <button
              onClick={() => onNavigate(history[0])}
              className="text-neutral-400 hover:text-white transition-colors"
              title="Go to root"
              aria-label="Navigate to root node"
            >
              ↑ Root
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CollapsibleNodeData {
  label: string;
  description?: string;
  expanded?: boolean;
  childrenIds?: string[]; 
  parentId?: string; // Add parent reference
  level?: number;
  width?: number; 
  height?: number; 
  // Dynamic properties added at runtime
  onToggleExpansion?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void; // Add click handler
  isGloballyExpanded?: boolean;
  isFocused?: boolean; // Add focus state
  isInFocusPath?: boolean; // Add focus path state
}

const elk = new Elk();

// ELK layout options - optimized for professional, clean appearance
const elkLayoutOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.alignment': 'CENTER',
  
  // Enhanced spacing for better visual clarity
  'elk.layered.spacing.nodeNodeBetweenLayers': '120', // Increased vertical spacing between levels
  'elk.spacing.nodeNode': '100', // Increased horizontal spacing between nodes
  'elk.spacing.edgeNode': '40', // Better edge-to-node spacing
  'elk.spacing.edgeEdge': '20', // Space between edges
  
  // Improved edge routing for cleaner connections
  'elk.edgeRouting': 'POLYLINE',
  'elk.layered.edgeRouting.polyline.sloppy': 'false', // Cleaner edge paths
  
  // Better layer management
  'elk.layered.compaction.postCompaction.strategy': 'BALANCED',
  'elk.layered.compaction.postCompaction.constraints': 'SEQUENCE',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  
  // Enhanced hierarchy handling
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  
  // Improved layout quality
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.crossingMinimization.greedySwitch': 'true',
  'elk.layered.layering.strategy': 'LONGEST_PATH',
  
  // Better aspect ratio and overall appearance
  'elk.aspectRatio': '1.6', // Golden ratio-inspired layout
  'elk.nodeSize.constraints': 'MINIMUM_SIZE',
  'elk.nodeSize.options': 'DEFAULT_MINIMUM_SIZE',
  
  // Padding and margins for professional appearance
  'elk.padding': '[top=40,left=40,bottom=40,right=40]',
  'elk.spacing.componentComponent': '80',
  
  // Performance optimizations
  'elk.stress.desired.edgeLength': '120',
  'elk.layered.thoroughness': '10' // Higher quality layout
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
    const elk = new Elk();
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

// Performance: Memoized collapsible node component
const CollapsibleNode = memo(function CollapsibleNode({ id, data, isConnectable }: NodeProps<CollapsibleNodeData>) {
  // Enhanced dynamic dimensions calculation with better text handling
  const calculateOptimalDimensions = (label: string, description?: string, level: number = 0) => {
    // More sophisticated text measurement
    const labelWords = label.split(' ').length;
    const labelLength = label.length;
    
    // Calculate optimal width based on content and level
    let baseWidth: number;
    if (labelLength <= 20) {
      baseWidth = Math.max(180, labelLength * 9);
    } else if (labelLength <= 40) {
      baseWidth = Math.max(220, labelLength * 8);
    } else {
      baseWidth = Math.max(280, Math.min(360, labelLength * 7));
    }
    
    // Account for multi-line text
    const estimatedLines = Math.ceil(labelLength / (baseWidth / 8));
    const labelHeight = Math.max(24, estimatedLines * 18);
    
    // Description height calculation
    let descriptionHeight = 0;
    if (description && description.length > 0) {
      const descLines = Math.ceil(description.length / (baseWidth / 6));
      descriptionHeight = Math.min(60, Math.max(20, descLines * 14));
    }
    
    // Level-based scaling with better proportions
    const levelConfigs = {
      0: { // Root
        widthMultiplier: 1.5,
        heightMultiplier: 1.4,
        fontSize: '16px',
        fontWeight: '700',
        padding: '20px 24px',
        minHeight: 100,
        lineHeight: '1.3'
      },
      1: { // Themes
        widthMultiplier: 1.3,
        heightMultiplier: 1.25,
        fontSize: '15px',
        fontWeight: '600',
        padding: '16px 20px',
        minHeight: 80,
        lineHeight: '1.25'
      },
      2: { // Concepts
        widthMultiplier: 1.1,
        heightMultiplier: 1.1,
        fontSize: '14px',
        fontWeight: '500',
        padding: '14px 18px',
        minHeight: 70,
        lineHeight: '1.2'
      },
      3: { // Details
        widthMultiplier: 1.0,
        heightMultiplier: 1.0,
        fontSize: '13px',
        fontWeight: '400',
        padding: '12px 16px',
        minHeight: 60,
        lineHeight: '1.2'
      },
      4: { // Sub-details
        widthMultiplier: 0.9,
        heightMultiplier: 0.9,
        fontSize: '12px',
        fontWeight: '400',
        padding: '10px 14px',
        minHeight: 50,
        lineHeight: '1.15'
      }
    };
    
    const config = levelConfigs[Math.min(level, 4) as keyof typeof levelConfigs] || levelConfigs[4];
    
    const finalWidth = Math.round(baseWidth * config.widthMultiplier);
    const finalHeight = Math.round(Math.max(
      config.minHeight,
      (labelHeight + descriptionHeight + 40) * config.heightMultiplier
    ));
    
    return {
      width: finalWidth,
      height: finalHeight,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      padding: config.padding,
      lineHeight: config.lineHeight
    };
  };

  const dimensions = calculateOptimalDimensions(data.label, data.description, data.level);

  // Assign width and height to data for ELK layout
  data.width = dimensions.width;
  data.height = dimensions.height;

  // Enhanced visual styles with better color harmony and depth
  const levelStyles = {
    0: { 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)', 
      color: 'white', 
      border: '3px solid #1e40af', 
      borderRadius: '18px', 
      boxShadow: '0 12px 32px rgba(30, 58, 138, 0.4), 0 4px 16px rgba(59, 130, 246, 0.3)',
      textAlign: 'center' as const
    },
    1: { 
      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)', 
      color: 'white', 
      border: '2px solid #0e7490', 
      borderRadius: '14px', 
      boxShadow: '0 8px 24px rgba(8, 145, 178, 0.35), 0 3px 12px rgba(6, 182, 212, 0.25)',
      textAlign: 'center' as const
    },
    2: { 
      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #5eead4 100%)', 
      color: '#003d3d', 
      border: '2px solid #0f766e', 
      borderRadius: '12px', 
      boxShadow: '0 6px 20px rgba(13, 148, 136, 0.3), 0 2px 8px rgba(20, 184, 166, 0.2)',
      textAlign: 'center' as const
    },
    3: { 
      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde047 100%)', 
      color: '#78350f', 
      border: '2px solid #d97706', 
      borderRadius: '10px', 
      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25), 0 2px 6px rgba(251, 191, 36, 0.2)',
      textAlign: 'center' as const
    },
    4: { 
      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fed7aa 100%)', 
      color: '#9a3412', 
      border: '1px solid #ea580c', 
      borderRadius: '8px', 
      boxShadow: '0 3px 12px rgba(249, 115, 22, 0.2), 0 1px 4px rgba(251, 146, 60, 0.15)',
      textAlign: 'center' as const
    },
  };

  const currentStyle = levelStyles[Math.min(data.level || 0, 4) as keyof typeof levelStyles] || levelStyles[4];

  // Smart text truncation with better word boundaries
  const getTruncatedText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  };

  const displayLabel = getTruncatedText(data.label, dimensions.width / 7);
  const displayDescription = data.description ? 
    getTruncatedText(data.description, dimensions.width / 5) : undefined;

  // Phase 2.2: Enhanced node click behavior with expand/collapse distinction
  const handleNodeClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    
    // If it's the expand/collapse button, handle that separately
    if ((event.target as HTMLElement).closest('.expand-button')) {
      return; // Let expand/collapse handle normally
    }
    
    // Otherwise, focus on this node
    data.onNodeClick?.(id);
  }, [data.onNodeClick, id]);

  return (
    <div 
      style={{ 
        ...currentStyle,
        width: dimensions.width,
        height: dimensions.height,
        padding: dimensions.padding,
        fontSize: dimensions.fontSize,
        fontWeight: dimensions.fontWeight,
        lineHeight: dimensions.lineHeight,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        // Phase 2.2: Enhanced focus styling
        ...(data.isFocused && {
          transform: 'scale(1.1)',
          zIndex: 10,
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5), 0 20px 40px rgba(0, 0, 0, 0.3)'
        }),
        ...(data.isInFocusPath && !data.isFocused && {
          boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.4), 0 8px 24px rgba(0, 0, 0, 0.2)'
        })
      }}
      className={`node-container hover:scale-105 hover:shadow-lg transition-all duration-300 ${
        data.isFocused ? 'focused' : ''
      } ${data.isInFocusPath ? 'in-focus-path' : ''}`}
      onClick={handleNodeClick}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        style={{
          background: '#6b7280',
          width: 8,
          height: 8,
          border: '2px solid white',
          top: -4
        }} 
      />
      
      <div className="flex flex-col items-center justify-center w-full h-full gap-1">
        {/* Main Label */}
        <div 
          className="font-semibold text-center leading-tight"
          style={{
            fontSize: dimensions.fontSize,
            fontWeight: dimensions.fontWeight,
            lineHeight: dimensions.lineHeight,
            wordBreak: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%'
          }}
          title={data.label}
        >
          {displayLabel}
        </div>
        
        {/* Description */}
        {displayDescription && (
          <div 
            className="text-center opacity-90 leading-tight"
            style={{
              fontSize: `calc(${dimensions.fontSize} * 0.8)`,
              lineHeight: '1.15',
              marginTop: '4px',
              wordBreak: 'break-word',
              hyphens: 'auto',
              maxWidth: '100%'
            }}
            title={data.description}
          >
            {displayDescription}
          </div>
        )}
        
        {/* Expand/Collapse Button */}
        {data.childrenIds && data.childrenIds.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if ((data as any).onToggleExpansion) {
                (data as any).onToggleExpansion(id);
              }
            }}
            className="expand-button absolute top-2 right-2 p-1.5 hover:bg-white/30 rounded-full transition-all duration-200 border border-white/20 hover:border-white/40 hover:scale-110"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(4px)'
            }}
            title={`${(data as any).isGloballyExpanded ? 'Collapse' : 'Expand'} children (${data.childrenIds.length})`}
          >
            {(data as any).isGloballyExpanded ? 
              <ChevronDownIcon className="h-3 w-3" /> : 
              <ChevronRightIcon className="h-3 w-3" />
            }
          </button>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        style={{
          background: '#6b7280',
          width: 8,
          height: 8,
          border: '2px solid white',
          bottom: -4
        }} 
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Performance: Custom comparison for memo optimization
  return (
    prevProps.id === nextProps.id &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.expanded === nextProps.data.expanded &&
    prevProps.data.isFocused === nextProps.data.isFocused &&
    prevProps.data.isInFocusPath === nextProps.data.isInFocusPath &&
    prevProps.data.isGloballyExpanded === nextProps.data.isGloballyExpanded
  );
});

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

  // Helper function to create meaningful sub-nodes from content
  const createMeaningfulSubNodes = (parentContent: any, parentId: string, parentLabel: string, startLevel: number): { childIds: string[], maxLevel: number } => {
    const childIds: string[] = [];
    let currentLevel = startLevel;
    let maxLevel = startLevel;

    if (typeof parentContent === 'string') {
      // Intelligent content analysis for meaningful breakdowns
      const content = parentContent.trim();
      
      // Look for structured patterns in the content
      const patterns = {
        // Key features or characteristics (look for bullet points, lists, or "includes" patterns)
        features: content.match(/(?:includes?|features?|consists? of|contains?)[:\s]([^.!?]*)/gi),
        // Benefits or advantages
        benefits: content.match(/(?:benefits?|advantages?|helps?|allows?|enables?)[:\s]([^.!?]*)/gi),
        // Examples or applications
        examples: content.match(/(?:examples?|such as|like|including|for instance)[:\s]([^.!?]*)/gi),
        // Steps or processes
        steps: content.match(/(?:steps?|process|procedure|how to)[:\s]([^.!?]*)/gi),
        // Technical details
        technical: content.match(/(?:technically|specifically|implementation|details?)[:\s]([^.!?]*)/gi),
      };

      // Create meaningful categories based on detected patterns
      Object.entries(patterns).forEach(([category, matches]) => {
        if (matches && matches.length > 0) {
          matches.slice(0, 3).forEach((match, index) => {
            const cleanMatch = match.replace(/^(?:includes?|features?|consists? of|contains?|benefits?|advantages?|helps?|allows?|enables?|examples?|such as|like|including|for instance|steps?|process|procedure|how to|technically|specifically|implementation|details?)[:\s]*/i, '').trim();
            
            if (cleanMatch.length > 15) {
              const detailNodeId = nodeIdCounter.toString();
              const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
              
              nodes.push({
                id: detailNodeId,
                type: 'collapsible',
                data: {
                  label: `${categoryLabel}: ${cleanMatch.length > 45 ? cleanMatch.substring(0, 42) + '...' : cleanMatch}`,
                  description: cleanMatch.length > 45 ? cleanMatch : `${categoryLabel} related to ${parentLabel}`,
                  childrenIds: [],
                parentId: parentId,
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
                type: 'curved', // Phase 4.2: Use custom curved edge
                style: { 
                  stroke: '#14b8a6', 
                  strokeWidth: 2.5,
                  strokeLinecap: 'round',
                  opacity: 0.9
                },
                data: {
                  isInFocusPath: false,
                  isFocused: false
                }
              });

              nodeIdCounter++;
            }
          });
        }
      });

      // If no patterns found, create logical topic breakdowns
      if (childIds.length === 0 && content.length > 50) {
        // Split by meaningful delimiters and create logical sub-topics
        const meaningfulSentences = content
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 20 && s.length < 200);

        // Group related sentences or create key point extractions
        const keyPoints = meaningfulSentences.slice(0, 3).map((sentence, index) => {
          // Extract the main concept from each sentence
          const mainConcept = sentence.split(/(?:,|;|\s(?:and|or|but|because|since|although)\s)/)[0].trim();
          return {
            concept: mainConcept.length > 8 ? mainConcept : sentence.substring(0, 50),
            detail: sentence
          };
        });

        keyPoints.forEach((point, index) => {
          if (point.concept.length > 8) {
            const conceptNodeId = nodeIdCounter.toString();
            
            nodes.push({
              id: conceptNodeId,
              type: 'collapsible',
              data: {
                label: point.concept.length > 50 ? point.concept.substring(0, 47) + '...' : point.concept,
                description: point.detail !== point.concept ? point.detail : `Key aspect of ${parentLabel}`,
                parentId: parentId,
                level: currentLevel + 1
              },
              position: { x: 0, y: 0 }
            });

            childIds.push(conceptNodeId);
            maxLevel = Math.max(maxLevel, currentLevel + 1);

            edges.push({
              id: `e${parentId}-${conceptNodeId}`,
              source: parentId,
              target: conceptNodeId,
              type: 'curved', // Phase 4.2: Use custom curved edge
              style: { 
                stroke: '#0d9488', 
                strokeWidth: 3,
                strokeLinecap: 'round',
                opacity: 0.85
              },
              data: {
                isInFocusPath: false,
                isFocused: false
              }
            });

            nodeIdCounter++;
          }
        });
      }
    } else if (Array.isArray(parentContent)) {
      // Handle arrays by creating logical groupings
      const groupSize = Math.ceil(parentContent.length / 3);
      const groups = [];
      
      for (let i = 0; i < parentContent.length; i += groupSize) {
        groups.push(parentContent.slice(i, i + groupSize));
      }

      groups.slice(0, 4).forEach((group, groupIndex) => {
        if (group.length > 0) {
          const groupNodeId = nodeIdCounter.toString();
          const groupLabel = `${parentLabel} Group ${groupIndex + 1}`;
          
          nodes.push({
            id: groupNodeId,
            type: 'collapsible',
            data: {
              label: groupLabel,
              description: `Contains ${group.length} related items`,
              childrenIds: [],
              parentId: parentId,
              level: currentLevel + 1
            },
            position: { x: 0, y: 0 }
          });

          childIds.push(groupNodeId);
          maxLevel = Math.max(maxLevel, currentLevel + 1);

          edges.push({
            id: `e${parentId}-${groupNodeId}`,
            source: parentId,
            target: groupNodeId,
            style: { stroke: '#ccf2ff', strokeWidth: 2 }
          });

          nodeIdCounter++;

          // Add items to this group
          const itemChildIds: string[] = [];
          group.slice(0, 4).forEach((item: any) => {
            const itemNodeId = nodeIdCounter.toString();
            const itemLabel = typeof item === 'string' ? item : 
                             typeof item === 'object' && item?.title ? item.title :
                             String(item);

            if (itemLabel.length > 5) {
              nodes.push({
                id: itemNodeId,
                type: 'collapsible',
                data: {
                  label: itemLabel.length > 40 ? itemLabel.substring(0, 37) + '...' : itemLabel,
                  description: typeof item === 'object' && item?.description ? item.description : undefined,
                  level: currentLevel + 2
                },
                position: { x: 0, y: 0 }
              });

              itemChildIds.push(itemNodeId);
              maxLevel = Math.max(maxLevel, currentLevel + 2);

              edges.push({
                id: `e${groupNodeId}-${itemNodeId}`,
                source: groupNodeId,
                target: itemNodeId,
                style: { stroke: '#e6f7ff', strokeWidth: 1.5 }
              });

              nodeIdCounter++;
            }
          });

          // Update group node with its children
          const groupNode = nodes.find(n => n.id === groupNodeId);
          if (groupNode) {
            groupNode.data.childrenIds = itemChildIds;
          }
        }
      });
    } else if (typeof parentContent === 'object' && parentContent !== null) {
      // Handle objects by creating meaningful property categories
      const propertyEntries = Object.entries(parentContent).slice(0, 5);
      
      propertyEntries.forEach(([key, value]) => {
        const objNodeId = nodeIdCounter.toString();
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        nodes.push({
          id: objNodeId,
          type: 'collapsible',
          data: {
            label: formattedKey,
            description: typeof value === 'string' && value.length > 10 ? 
                        value.substring(0, 80) + (value.length > 80 ? '...' : '') : 
                        `${formattedKey} details for ${parentLabel}`,
            childrenIds: [],
            parentId: parentId,
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

        // Only recurse if the value is meaningful and we're not too deep
        if (currentLevel < 4 && ((typeof value === 'string' && value.length > 30) || Array.isArray(value))) {
          const subResult = createMeaningfulSubNodes(value, objNodeId, formattedKey, currentLevel + 1);
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
        parentId: rootNodeId,
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
      type: 'curved', // Phase 4.2: Use custom curved edge
      animated: true,
      style: { 
        stroke: category.color, 
        strokeWidth: 4, 
        strokeDasharray: '8,4',
        strokeLinecap: 'round',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: category.color
      },
      data: {
        isInFocusPath: false,
        isFocused: false
      }
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
          parentId: themeNodeId,
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
        type: 'curved', // Phase 4.2: Use custom curved edge
        style: { 
          stroke: '#0d9488', 
          strokeWidth: 3,
          strokeLinecap: 'round',
          opacity: 0.85
        },
        data: {
          isInFocusPath: false,
          isFocused: false
        }
      });

      nodeIdCounter++;

      // Create detailed sub-nodes for this concept (infinite levels)
      const detailResult = createMeaningfulSubNodes(item, conceptNodeId, itemLabel, 2);
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

export const MindMapDisplay = memo(function MindMapDisplay({ playlistTitle, playlistId, keyConceptsFromSummary, enhancedSummaryData }: MindMapDisplayProps) {
  // Performance: Reduced debug logging
  const renderCount = useRef(0);
  renderCount.current++;

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

  // Phase 1: Focus State Management - New state variables for NotebookLM-style navigation
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [focusHistory, setFocusHistory] = useState<string[]>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Performance: Use refs for heavy operations
  const mindMapContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<any>(null);
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLayoutTime = useRef<number>(0);

  // Performance: Memoize expensive calculations
  const elkLayoutOptions = useMemo(() => ({
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '60',
    'elk.layered.spacing.nodeNodeBetweenLayers': '120',
    'elk.spacing.componentComponent': '80',
    'elk.alignment': 'CENTER',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.padding': '[top=40,left=40,bottom=40,right=40]'
  }), []);

  const setRfInstance = (instance: any) => {
    rfInstanceRef.current = instance;
  };

  // Performance: Debounced layout application to prevent excessive calculations
  const debouncedApplyELKLayout = useCallback(async (
    nodes: Node<CollapsibleNodeData>[], 
    edges: Edge[], 
    customOptions?: Record<string, string>,
    force: boolean = false
  ) => {
    const now = Date.now();
    const minInterval = 100; // Minimum 100ms between layout calculations

    // Clear existing timeout
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }

    // If forced or enough time has passed, apply immediately
    if (force || (now - lastLayoutTime.current) > minInterval) {
      lastLayoutTime.current = now;
      return applyELKLayoutImmediate(nodes, edges, customOptions);
    }

    // Otherwise, debounce
    return new Promise<void>((resolve) => {
      layoutTimeoutRef.current = setTimeout(async () => {
        lastLayoutTime.current = Date.now();
        await applyELKLayoutImmediate(nodes, edges, customOptions);
        resolve();
      }, minInterval - (now - lastLayoutTime.current));
    });
  }, []);

  // Phase 3.2: Enhanced ELK Layout Application with Focus Positioning
  const applyELKLayoutImmediate = useCallback(async (
    nodes: Node<CollapsibleNodeData>[], 
    edges: Edge[], 
    customOptions?: Record<string, string>
  ) => {
    try {
      // Merge with custom options for focus layouts
      const layoutOptions = {
        ...elkLayoutOptions,
        ...customOptions
      };

      // Performance: Skip layout if nodes array is empty
      if (nodes.length === 0) {
        setDisplayedNodes([]);
        setDisplayedEdges([]);
        return;
      }

      // Enhanced ELK node preparation with focus positioning (memoized calculations)
      const elkNodes = nodes.map(node => {
        // Calculate optimal dimensions based on content
        const baseWidth = node.data.width || 200;
        const baseHeight = node.data.height || 100;
        
        // Enhance focused node dimensions for better visibility
        const focusedMultiplier = node.data.isFocused ? 1.2 : 1.0;
        const pathMultiplier = node.data.isInFocusPath ? 1.1 : 1.0;
        
        const elkNode: any = {
          id: node.id,
          width: Math.round(baseWidth * focusedMultiplier * pathMultiplier),
          height: Math.round(baseHeight * focusedMultiplier * pathMultiplier)
        };

        // Add special positioning hints for focused node (NotebookLM style)
        if (node.data.isFocused) {
          elkNode.layoutOptions = {
            'elk.position': '[x=300,y=400]',
            'elk.priority': '100' // High priority for focused node
          };
        } else if (node.data.isInFocusPath) {
          elkNode.layoutOptions = {
            'elk.priority': '50' // Medium priority for focus path
          };
        }
        
        return elkNode;
      });

      // Create ELK graph structure
      const elkGraph = {
        id: 'root',
        layoutOptions,
        children: elkNodes,
        edges: edges.map(edge => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
          // Enhanced edge styling for focus paths
          ...(edges.find(e => e.id === edge.id)?.style && {
            layoutOptions: {
              'elk.edgeThickness': edges.find(e => e.id === edge.id)?.style?.strokeWidth?.toString() || '2'
            }
          })
        }))
      };

      // Apply ELK layout
      const elk = new Elk();
      const layout = await elk.layout(elkGraph);
      
      // Apply positions with smooth transitions and focus enhancements
      const updatedNodes = nodes.map(node => {
        const elkNode = layout.children?.find(n => n.id === node.id);
        const basePosition = {
          x: elkNode?.x || 0,
          y: elkNode?.y || 0
        };

        // Apply focus-specific positioning adjustments
        if (node.data.isFocused) {
          // Ensure focused node is well-positioned for NotebookLM style
          basePosition.x = Math.max(basePosition.x, 300);
          basePosition.y = Math.max(basePosition.y, 200);
        }

        return {
          ...node,
          position: basePosition,
          // Update dimensions to match ELK calculations
          ...(elkNode && {
            data: {
              ...node.data,
              width: elkNode.width,
              height: elkNode.height
            }
          })
        };
      });

      // Performance: Batch state updates
      setDisplayedNodes(updatedNodes);
      setDisplayedEdges(edges);
      
      // Performance: Optimized viewport transition with requestAnimationFrame
      requestAnimationFrame(() => {
        if (rfInstanceRef.current) {
          const focusedNode = updatedNodes.find(n => n.data.isFocused);
          
          if (focusedNode) {
            // Focus specifically on the focused node with optimal framing
            rfInstanceRef.current.fitView({
              nodes: [focusedNode],
              duration: 300, // Reduced duration for snappier feel
              padding: 0.3,
              maxZoom: 1.5,
              minZoom: 0.5
            });
          } else {
            // Fallback to general view with focus path context
            const focusPathNodes = updatedNodes.filter(n => n.data.isInFocusPath);
            if (focusPathNodes.length > 0) {
              rfInstanceRef.current.fitView({
                nodes: focusPathNodes,
                duration: 300,
                padding: 0.25,
                maxZoom: 1.2
              });
            } else {
              // General layout view
              rfInstanceRef.current.fitView({
                padding: 0.2,
                duration: 300,
                maxZoom: 1.2
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('Error applying enhanced ELK layout:', error);
      // Fallback to basic layout application
      try {
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges, customOptions || {});
        setDisplayedNodes(layoutedNodes);
        setDisplayedEdges(layoutedEdges);
      } catch (fallbackError) {
        console.error('Fallback layout also failed:', fallbackError);
      }
    }
  }, []);

  // Phase 5.2: Helper function to get relevant node IDs for focus path
  const getRelevantNodeIds = useCallback((focusNodeId: string | null): Set<string> => {
    if (!focusNodeId) return new Set();
    
    const relevantIds = new Set<string>();
    const focusedNode = allNodes.find(n => n.id === focusNodeId);
    
    if (!focusedNode) return relevantIds;
    
    // Add the focused node itself
    relevantIds.add(focusNodeId);
    
    // Add immediate children
    if (focusedNode.data.childrenIds) {
      focusedNode.data.childrenIds.forEach(childId => {
        relevantIds.add(childId);
      });
    }
    
    // Add parent
    if (focusedNode.data.parentId) {
      relevantIds.add(focusedNode.data.parentId);
      
      // Add siblings (children of the same parent)
      const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
      if (parentNode?.data.childrenIds) {
        parentNode.data.childrenIds.forEach(siblingId => {
          relevantIds.add(siblingId);
        });
      }
    }
    
    // Add nodes from focus history for breadcrumb context
    focusHistory.forEach(historyId => {
      relevantIds.add(historyId);
    });
    
    return relevantIds;
  }, [allNodes, focusHistory]);

  // Phase 2: Click-to-Focus Navigation - Handler functions defined first
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

  // Phase 2: Click-to-Focus Navigation - Focus handler for NotebookLM-style navigation
  const handleNodeFocus = useCallback((nodeId: string) => {
    if (focusedNodeId === nodeId) return; // Already focused
    
    setIsTransitioning(true);
    setFocusedNodeId(nodeId);
    
    // Add to history for breadcrumb navigation
    setFocusHistory(prev => [...prev.filter(id => id !== nodeId), nodeId]);
    
    setTimeout(() => setIsTransitioning(false), 600);
  }, [focusedNodeId]);

  // Phase 5.2: Enhanced node data creator for consistent focus state passing
  const createEnhancedNodes = useCallback((nodes: Node<CollapsibleNodeData>[]): Node<CollapsibleNodeData>[] => {
    const relevantNodeIds = getRelevantNodeIds(focusedNodeId);
    
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onNodeClick: handleNodeFocus,
        onToggleExpansion: handleToggleNodeExpansion,
        isFocused: node.id === focusedNodeId,
        isInFocusPath: relevantNodeIds.has(node.id),
        isGloballyExpanded: expandedNodeIds.has(node.id)
      }
    }));
  }, [focusedNodeId, getRelevantNodeIds, handleNodeFocus, handleToggleNodeExpansion, expandedNodeIds]);

  // Phase 3: Focus-Based Layout Algorithm - Calculate layout for focused node  
  const calculateFocusedLayout = useCallback((focusedNodeId: string) => {
    const focusedNode = allNodes.find(n => n.id === focusedNodeId);
    if (!focusedNode) return;
    
    // Store current positions before transition
    const currentPositions: Record<string, { x: number; y: number }> = {};
    displayedNodes.forEach(node => {
      currentPositions[node.id] = { x: node.position.x, y: node.position.y };
    });
    setNodePositions(currentPositions);
    
    // Create a new layout configuration for ELK - NotebookLM style
    const focusedLayoutOptions = {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT', // Change to horizontal for NotebookLM style
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '200',
      'elk.spacing.componentComponent': '100',
      'elk.alignment': 'CENTER',
      'elk.edgeRouting': 'POLYLINE',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]'
    };
    
    // Filter nodes to show focused node + its immediate connections
    const relevantNodeIds = new Set([
      focusedNodeId,
      ...(focusedNode.data.childrenIds || []),
      ...(focusedNode.data.parentId ? [focusedNode.data.parentId] : [])
    ]);
    
    // Add siblings if we have a parent (for better context)
    if (focusedNode.data.parentId) {
      const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
      if (parentNode?.data.childrenIds) {
        parentNode.data.childrenIds.forEach(siblingId => {
          relevantNodeIds.add(siblingId);
        });
      }
    }
    
    // Update displayed nodes with focus context using enhanced node creator
    const filteredNodes = allNodes.filter(node => relevantNodeIds.has(node.id));
    const focusedNodes = createEnhancedNodes(filteredNodes);
    
    const focusedEdges = allEdges.filter(edge => 
      relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target)
    ).map(edge => {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      const targetNode = allNodes.find(n => n.id === edge.target);
      const isSourceFocused = sourceNode?.id === focusedNodeId;
      const isTargetFocused = targetNode?.id === focusedNodeId;
      const isFocused = isSourceFocused || isTargetFocused;
      const isInFocusPath = relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target);
      
      return {
        ...edge,
        type: edge.type || 'curved', // Ensure curved type
        className: `${edge.className || ''} focus-edge`.trim(),
        data: {
          ...edge.data,
          isFocused,
          isInFocusPath
        }
      };
    });
    
    // Apply new layout with debouncing for better performance
    debouncedApplyELKLayout(focusedNodes, focusedEdges, focusedLayoutOptions);
    
  }, [allNodes, allEdges, displayedNodes, createEnhancedNodes, debouncedApplyELKLayout]);

  // Effect to handle layout calculation when focused node changes
  useEffect(() => {
    if (focusedNodeId && allNodes.length > 0) {
      calculateFocusedLayout(focusedNodeId);
    }
  }, [focusedNodeId, calculateFocusedLayout, allNodes.length]);



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
      visibleNodesAccumulator.push(node);

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
    ).map(edge => {
      // Phase 4.1 & 4.2: Add focus-based edge styling and curved edge data
      const sourceNode = visibleNodesAccumulator.find(n => n.id === edge.source);
      const targetNode = visibleNodesAccumulator.find(n => n.id === edge.target);
      const isSourceFocused = sourceNode?.data.isFocused || false;
      const isTargetFocused = targetNode?.data.isFocused || false;
      const isSourceInPath = sourceNode?.data.isInFocusPath || false;
      const isTargetInPath = targetNode?.data.isInFocusPath || false;
      
      const isFocused = isSourceFocused && isTargetFocused;
      const isInFocusPath = (isSourceInPath || isSourceFocused) && (isTargetInPath || isTargetFocused);
      
      return {
        ...edge,
        type: edge.type || 'curved', // Default to curved if no type specified
        className: `${edge.className || ''} ${!isInFocusPath ? 'dimmed' : ''}`.trim(),
        data: {
          ...edge.data,
          isFocused,
          isInFocusPath
        }
      };
    });

    // Phase 5.2: Use enhanced node data creator for consistent focus state
    const enhancedVisibleNodes = createEnhancedNodes(visibleNodesAccumulator);
    
    return { visibleNodes: enhancedVisibleNodes, visibleEdges };
  }, [allNodes, allEdges, expandedNodeIds, createEnhancedNodes]);

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

  // Performance: Cleanup layout timeouts on unmount
  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, []);

  // Phase 6.2: Enhanced Keyboard Navigation with Improved Key Mappings
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      if (!focusedNodeId) {
        // When no node is focused, allow basic navigation
        if (event.key === '/' || event.key === 'f') {
          // Focus on root node with '/' or 'f' key
          const rootNode = allNodes.find(node => node.data.level === 0);
          if (rootNode) {
            handleNodeFocus(rootNode.id);
            event.preventDefault();
          }
        }
        return;
      }
      
      const focusedNode = allNodes.find(n => n.id === focusedNodeId);
      if (!focusedNode) return;

      switch (event.key) {
        case 'Escape':
          // Clear focus and return to overview
          setFocusedNodeId(null);
          setFocusHistory([]);
          event.preventDefault();
          break;
          
        case 'ArrowRight':
          // Navigate to first child (horizontal model: right = deeper)
          if (focusedNode.data.childrenIds && focusedNode.data.childrenIds.length > 0) {
            handleNodeFocus(focusedNode.data.childrenIds[0]);
            event.preventDefault();
          }
          break;
          
        case 'ArrowLeft':
          // Navigate to parent (horizontal model: left = shallower)
          if (focusedNode.data.parentId) {
            handleNodeFocus(focusedNode.data.parentId);
            event.preventDefault();
          }
          break;
          
        case 'ArrowUp':
        case 'ArrowDown':
          // Navigate between siblings (vertical model: up/down = same level)
          if (focusedNode.data.parentId) {
            const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
            if (parentNode?.data.childrenIds && parentNode.data.childrenIds.length > 1) {
              const currentIndex = parentNode.data.childrenIds.indexOf(focusedNodeId);
              if (currentIndex !== -1) {
                const direction = event.key === 'ArrowUp' ? -1 : 1;
                const newIndex = (currentIndex + direction + parentNode.data.childrenIds.length) % parentNode.data.childrenIds.length;
                handleNodeFocus(parentNode.data.childrenIds[newIndex]);
                event.preventDefault();
              }
            }
          }
          break;
          
        case 'Enter':
        case ' ':
          // Toggle expansion of focused node
          if (focusedNode.data.childrenIds && focusedNode.data.childrenIds.length > 0) {
            handleToggleNodeExpansion(focusedNodeId);
            event.preventDefault();
          }
          break;

        // Phase 6.2: Advanced keyboard shortcuts
        case 'Home':
          // Navigate to root node
          const rootNode = allNodes.find(node => node.data.level === 0);
          if (rootNode && rootNode.id !== focusedNodeId) {
            handleNodeFocus(rootNode.id);
            event.preventDefault();
          }
          break;

        case 'End':
          // Navigate to deepest child in current branch
          let deepestNode = focusedNode;
          while (deepestNode.data.childrenIds && deepestNode.data.childrenIds.length > 0) {
            const nextNodeId = deepestNode.data.childrenIds[0];
            const nextNode = allNodes.find(n => n.id === nextNodeId);
            if (nextNode) {
              deepestNode = nextNode;
            } else {
              break;
            }
          }
          if (deepestNode.id !== focusedNodeId) {
            handleNodeFocus(deepestNode.id);
            event.preventDefault();
          }
          break;

        case 'PageUp':
          // Navigate to first sibling
          if (focusedNode.data.parentId) {
            const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
            if (parentNode?.data.childrenIds && parentNode.data.childrenIds.length > 0) {
              handleNodeFocus(parentNode.data.childrenIds[0]);
              event.preventDefault();
            }
          }
          break;

        case 'PageDown':
          // Navigate to last sibling
          if (focusedNode.data.parentId) {
            const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
            if (parentNode?.data.childrenIds && parentNode.data.childrenIds.length > 0) {
              const lastChildId = parentNode.data.childrenIds[parentNode.data.childrenIds.length - 1];
              handleNodeFocus(lastChildId);
              event.preventDefault();
            }
          }
          break;

        case 'Backspace':
          // Navigate back in focus history
          if (focusHistory.length > 1) {
            const previousNodeId = focusHistory[focusHistory.length - 2];
            handleNodeFocus(previousNodeId);
            event.preventDefault();
          }
          break;

        // Number keys for quick child selection
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          const childIndex = parseInt(event.key) - 1;
          if (focusedNode.data.childrenIds && 
              childIndex < focusedNode.data.childrenIds.length) {
            handleNodeFocus(focusedNode.data.childrenIds[childIndex]);
            event.preventDefault();
          }
          break;

        // Letter shortcuts
        case '+':
        case '=':
          // Expand all children
          if (focusedNode.data.childrenIds && focusedNode.data.childrenIds.length > 0) {
            if (!expandedNodeIds.has(focusedNodeId)) {
              handleToggleNodeExpansion(focusedNodeId);
            }
            event.preventDefault();
          }
          break;

        case '-':
          // Collapse current node
          if (expandedNodeIds.has(focusedNodeId)) {
            handleToggleNodeExpansion(focusedNodeId);
            event.preventDefault();
          }
          break;

        case '*':
          // Expand/collapse all children recursively
          if (focusedNode.data.childrenIds && focusedNode.data.childrenIds.length > 0) {
            const toggleRecursively = (nodeId: string) => {
              const node = allNodes.find(n => n.id === nodeId);
              if (node?.data.childrenIds && node.data.childrenIds.length > 0) {
                if (!expandedNodeIds.has(nodeId)) {
                  handleToggleNodeExpansion(nodeId);
                }
                node.data.childrenIds.forEach(childId => toggleRecursively(childId));
              }
            };
            toggleRecursively(focusedNodeId);
            event.preventDefault();
          }
          break;

        case '?':
        case 'h':
          // Show/hide keyboard help
          setShowKeyboardHelp(!showKeyboardHelp);
          event.preventDefault();
          break;
      }
    };

    // Use 'keydown' for better responsiveness
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [focusedNodeId, allNodes, handleNodeFocus, handleToggleNodeExpansion, expandedNodeIds, focusHistory]);

  // Performance: Optimized layout effect with debouncing and better dependency management
  const performLayoutDebounced = useCallback(async () => {
      if (allNodes.length === 0) return;
    
      setIsLoading(true);
    try {
      const { visibleNodes, visibleEdges } = getVisibleNodesAndEdges();
      
      if (visibleNodes.length > 0) {
        // Use debounced layout for better performance
        await debouncedApplyELKLayout(visibleNodes, visibleEdges, elkLayoutOptions, false);
        
        // Optimized viewport handling
        requestAnimationFrame(() => {
          if (rfInstanceRef.current) {
            let focusIds: string[] = [];
            let padding = 0.25;

            // Find the actual root node
            const rootNode = visibleNodes.find(node => node.data.level === 0);
            const rootNodeId = rootNode?.id;

            // Performance: Simplified focus logic
            if (visibleNodes.length === 1 && rootNodeId && expandedNodeIds.size <= 1) {
              focusIds = [rootNodeId];
              padding = 0.8;
            } else if (lastInteractedNodeId && visibleNodes.some(n => n.id === lastInteractedNodeId)) {
              focusIds = [lastInteractedNodeId];
              
              const interactedNode = visibleNodes.find(n => n.id === lastInteractedNodeId);
              if (expandedNodeIds.has(lastInteractedNodeId) && interactedNode?.data.childrenIds) {
                focusIds.push(...interactedNode.data.childrenIds.filter(childId => 
                  visibleNodes.some(ln => ln.id === childId)
                ));
                }
                
              padding = focusIds.length > 1 ? 0.2 : 0.4;
                }

            // Apply fitView with reduced duration for snappier feel
            if (focusIds.length > 0) {
              rfInstanceRef.current.fitView({
                nodes: focusIds.map(id => ({ id })),
                padding: padding,
                duration: 200 // Reduced from 600ms
              });
            } else if (visibleNodes.length > 0) {
              rfInstanceRef.current.fitView({ 
                padding: 0.25, 
                duration: 200 
              });
            }
          }
        });
      } else {
        setDisplayedNodes([]);
        setDisplayedEdges([]);
      }
    } catch (error) {
      console.error('Layout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [allNodes.length, expandedNodeIds, lastInteractedNodeId, getVisibleNodesAndEdges, debouncedApplyELKLayout, elkLayoutOptions]);

  // Effect to update layout when visible nodes/edges change (due to expansion)
  useEffect(() => {
    if (allNodes.length > 0) {
      performLayoutDebounced();
    }
  }, [allNodes, allEdges, expandedNodeIds, performLayoutDebounced]);

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
          nodes={createEnhancedNodes(displayedNodes)} // Phase 5.2: Use enhanced node data
          edges={displayedEdges.map(edge => ({
            ...edge,
            type: 'curved', // Phase 5.1: Ensure all edges use custom curved type
            data: {
              ...edge.data,
              // Enhanced focus path detection
              isInFocusPath: focusedNodeId ? (
                edge.source === focusedNodeId || 
                edge.target === focusedNodeId ||
                focusHistory.includes(edge.source) ||
                focusHistory.includes(edge.target)
              ) : (edge.data?.isInFocusPath || false),
              isFocused: focusedNodeId ? (
                edge.source === focusedNodeId && edge.target === focusedNodeId
              ) : (edge.data?.isFocused || false)
            }
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes} // Phase 4.2: Add custom curved edge types
          onNodeClick={(event, node) => {
            // Phase 5.1: Integrate focus behavior with node clicks
            event.preventDefault();
            handleNodeFocus(node.id);
          }}
          onPaneClick={(event) => {
            // Phase 5.1: Clear focus when clicking on empty space
            if (!event.defaultPrevented) {
              setFocusedNodeId(null);
              setFocusHistory([]);
            }
          }}
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
            
            {/* Phase 5.1: Focus Status and Keyboard Shortcuts Panel */}
            {focusedNodeId && (
              <Panel position="top-right" className="bg-neutral-800/95 backdrop-blur-sm border border-neutral-600 rounded-lg p-3 text-white text-xs space-y-2 max-w-xs">
                <div className="font-medium text-primary">Focus Mode Active</div>
                <div className="text-neutral-300">
                  Focused: <span className="text-white font-medium">
                    {allNodes.find(n => n.id === focusedNodeId)?.data.label.substring(0, 30)}
                    {(allNodes.find(n => n.id === focusedNodeId)?.data.label.length || 0) > 30 ? '...' : ''}
                  </span>
                </div>
                                <div className="border-t border-neutral-600 pt-2 space-y-1">
                  <div className="font-medium text-neutral-200">Keyboard Navigation:</div>
                  <div className="space-y-0.5 text-neutral-400">
                    <div><kbd className="bg-neutral-700 px-1 rounded">←</kbd> Parent <kbd className="bg-neutral-700 px-1 rounded">→</kbd> Child</div>
                    <div><kbd className="bg-neutral-700 px-1 rounded">↑↓</kbd> Siblings</div>
                    <div><kbd className="bg-neutral-700 px-1 rounded">1-9</kbd> Quick Child</div>
                    <div><kbd className="bg-neutral-700 px-1 rounded">Home</kbd> Root <kbd className="bg-neutral-700 px-1 rounded">End</kbd> Deepest</div>
                    <div><kbd className="bg-neutral-700 px-1 rounded">Enter</kbd> Expand <kbd className="bg-neutral-700 px-1 rounded">-</kbd> Collapse</div>
                    <div><kbd className="bg-neutral-700 px-1 rounded">Esc</kbd> Clear Focus</div>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    <kbd className="bg-neutral-700 px-1 rounded text-xs">/ or f</kbd> to start navigation
                  </div>
                </div>
               </Panel>
             )}

            {/* Phase 6.1: Enhanced Breadcrumb Navigation Component */}
            {focusHistory.length > 0 && (
              <Panel position="top-left" className="bg-neutral-800/95 backdrop-blur-sm border border-neutral-600 rounded-lg p-3 text-white">
                <BreadcrumbNavigation
                  history={focusHistory}
                  allNodes={allNodes}
                  focusedNodeId={focusedNodeId}
                  onNavigate={handleNodeFocus}
                />
              </Panel>
            )}

            {/* Phase 6.2: Comprehensive Keyboard Help Panel */}
            {showKeyboardHelp && (
              <Panel position="top-center" className="bg-neutral-900/98 backdrop-blur-sm border border-neutral-600 rounded-lg p-4 text-white max-w-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-primary">Keyboard Navigation Guide</h3>
                  <button
                    onClick={() => setShowKeyboardHelp(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-2">Basic Navigation</h4>
                    <div className="space-y-1 text-neutral-400">
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">← →</kbd>Parent / First Child</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">↑ ↓</kbd>Previous / Next Sibling</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">Enter</kbd>Toggle Expansion</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">Esc</kbd>Clear Focus</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-2">Quick Navigation</h4>
                    <div className="space-y-1 text-neutral-400">
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">Home</kbd>Go to Root</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">End</kbd>Go to Deepest Child</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">PgUp</kbd>First Sibling</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">PgDn</kbd>Last Sibling</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">Backspace</kbd>Previous in History</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-2">Child Selection</h4>
                    <div className="space-y-1 text-neutral-400">
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">1-9</kbd>Jump to Child by Number</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">/ or f</kbd>Start Navigation (Root)</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-2">Expansion Controls</h4>
                    <div className="space-y-1 text-neutral-400">
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">+ =</kbd>Expand Current</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">-</kbd>Collapse Current</div>
                      <div><kbd className="bg-neutral-700 px-2 py-1 rounded mr-2">*</kbd>Expand All Recursively</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-neutral-600 text-center">
                  <div className="text-xs text-neutral-500">
                    Press <kbd className="bg-neutral-700 px-1 rounded">?</kbd> or <kbd className="bg-neutral-700 px-1 rounded">h</kbd> to toggle this help
                  </div>
                </div>
              </Panel>
            )}
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
}, (prevProps, nextProps) => {
  // Performance: Memoization for expensive mind map re-renders
  return (
    prevProps.playlistTitle === nextProps.playlistTitle &&
    prevProps.playlistId === nextProps.playlistId &&
    JSON.stringify(prevProps.keyConceptsFromSummary) === JSON.stringify(nextProps.keyConceptsFromSummary) &&
    JSON.stringify(prevProps.enhancedSummaryData) === JSON.stringify(nextProps.enhancedSummaryData)
  );
});

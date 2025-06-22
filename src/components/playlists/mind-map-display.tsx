'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { BrainIcon, ExpandIcon, DownloadIcon, XIcon, Loader2Icon, RotateCcwIcon, ImageIcon, FileTextIcon, MinimizeIcon, MaximizeIcon, AlertCircleIcon, RefreshCwIcon, ChevronRightIcon, ChevronDownIcon, UserIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { mindMapService } from "@/services/bertRecommendationService";
import { useAuth } from "@/contexts/AuthContext";
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
    box-shadow: 0 8px 25px #4f46e5, 0 4px 16px #3b82f6 !important;
    border: 2px solid #4F46E5 !important;
    z-index: 10 !important;
  }

  .node-container.in-focus-path {
    opacity: 1 !important;
    transform: scale(1.02) !important;
  }

      .node-container:not(.in-focus-path):not(.focused) {
      opacity: 1 !important;
      filter: none !important;
  }

  .node-container {
    transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
    cursor: pointer !important;
  }

  .node-container:hover:not(.focused) {
    transform: scale(1.03) !important;
    box-shadow: 0 4px 15px #000000 !important;
  }

  /* Smooth edge transitions */
  .react-flow__edge {
    transition: none !important;
  }

  .react-flow__edge.dimmed {
    opacity: 1 !important;
  }

  /* Enhanced focus path highlighting */
  .node-container.in-focus-path:not(.focused) {
    box-shadow: 0 0 0 2px #22c55e, 0 6px 20px #000000 !important;
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
      box-shadow: 0 0 0 0 #4f46e5;
    }
    50% {
      transform: scale(1.08);
      box-shadow: 0 8px 25px #4f46e5, 0 0 0 4px #4f46e5;
    }
    100% {
      transform: scale(1.05);
      box-shadow: 0 8px 25px #4f46e5, 0 4px 16px #3b82f6;
    }
  }

  /* Enhanced edge focus styling */
  .react-flow__edge.focus-edge path {
    stroke-width: 3px !important;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) !important;
  }

  /* Smooth dimming transition for non-focused elements */
  .react-flow__edge.dimmed path {
    stroke-opacity: 1 !important;
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
          box-shadow: 0 2px 4px #000000;
  }

  .breadcrumb-button:active {
    transform: translateY(0);
  }

  .separator {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 1; }
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
    opacity = 1;
  } else {
    strokeColor = '#9CA3AF'; // Light gray for non-focused
    strokeWidth = 2;
    opacity = 1;
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
          opacity={1}
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
          transition: 'stroke 0.4s ease, stroke-width 0.4s ease',
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
    
    // Calculate optimal width based on content and level (increased sizes)
    let baseWidth: number;
    if (labelLength <= 20) {
      baseWidth = Math.max(220, labelLength * 11);
    } else if (labelLength <= 40) {
      baseWidth = Math.max(280, labelLength * 10);
    } else {
      baseWidth = Math.max(350, Math.min(450, labelLength * 9));
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
    
    // Level-based scaling with enhanced proportions for progressive disclosure
    const levelConfigs = {
      0: { // Root - Larger and more prominent
        widthMultiplier: 1.8,
        heightMultiplier: 1.6,
        fontSize: '18px',
        fontWeight: '700',
        padding: '24px 32px',
        minHeight: 120,
        lineHeight: '1.3'
      },
      1: { // First level themes - Prominent but smaller than root
        widthMultiplier: 1.5,
        heightMultiplier: 1.4,
        fontSize: '16px',
        fontWeight: '600',
        padding: '20px 24px',
        minHeight: 100,
        lineHeight: '1.25'
      },
      2: { // Second level concepts - Well-sized for readability
        widthMultiplier: 1.3,
        heightMultiplier: 1.2,
        fontSize: '15px',
        fontWeight: '500',
        padding: '18px 22px',
        minHeight: 85,
        lineHeight: '1.2'
      },
      3: { // Third level details - Balanced size
        widthMultiplier: 1.1,
        heightMultiplier: 1.1,
        fontSize: '14px',
        fontWeight: '400',
        padding: '16px 20px',
        minHeight: 75,
        lineHeight: '1.2'
      },
      4: { // Fourth level sub-details - Compact but readable
        widthMultiplier: 1.0,
        heightMultiplier: 1.0,
        fontSize: '13px',
        fontWeight: '400',
        padding: '14px 18px',
        minHeight: 65,
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

  // Enhanced visual styles with solid colors and no transparency
  const levelStyles = {
    0: { 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)', 
      color: 'white', 
      border: '3px solid #1e40af', 
      borderRadius: '18px', 
      boxShadow: '0 8px 24px #1e3a8a, 0 4px 12px #3b82f6',
      textAlign: 'center' as const,
      opacity: 1
    },
    1: { 
      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)', 
      color: 'white', 
      border: '2px solid #0e7490', 
      borderRadius: '14px', 
      boxShadow: '0 6px 20px #0891b2, 0 3px 10px #06b6d4',
      textAlign: 'center' as const,
      opacity: 1
    },
    2: { 
      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #5eead4 100%)', 
      color: '#ffffff', 
      border: '2px solid #0f766e', 
      borderRadius: '12px', 
      boxShadow: '0 5px 18px #0d9488, 0 2px 8px #14b8a6',
      textAlign: 'center' as const,
      opacity: 1
    },
    3: { 
      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde047 100%)', 
      color: '#000000', 
      border: '2px solid #d97706', 
      borderRadius: '10px', 
      boxShadow: '0 4px 16px #f59e0b, 0 2px 6px #fbbf24',
      textAlign: 'center' as const,
      opacity: 1
    },
    4: { 
      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fed7aa 100%)', 
      color: '#000000', 
      border: '2px solid #ea580c', 
      borderRadius: '8px', 
      boxShadow: '0 3px 12px #f97316, 0 1px 4px #fb923c',
      textAlign: 'center' as const,
      opacity: 1
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
          boxShadow: '0 0 0 4px #3b82f6, 0 8px 20px #1e40af'
        }),
        ...(data.isInFocusPath && !data.isFocused && {
          boxShadow: '0 0 0 3px #22c55e, 0 6px 16px #16a34a'
        })
      }}
      className={`node-container hover:scale-[1.02] hover:shadow-xl transition-all duration-500 ease-out transform-gpu will-change-transform ${
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
            className="text-center leading-tight"
            style={{
              fontSize: `calc(${dimensions.fontSize} * 0.8)`,
              lineHeight: '1.15',
              marginTop: '4px',
              wordBreak: 'break-word',
              hyphens: 'auto',
              maxWidth: '100%',
              opacity: 1
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
            className="expand-button absolute top-2 right-2 p-1.5 hover:bg-white/50 rounded-full transition-all duration-200 border-2 border-white hover:border-gray-200 hover:scale-110"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              color: '#000000'
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
  currentVideo: {
    id: string;
    title: string;
    youtubeURL: string;
    thumbnail?: string;
    duration?: string;
    summary?: string;
  } | null; 
  keyConceptsFromSummary?: string[];
  enhancedSummaryData?: any;
}

// Removed old client-side mind map generation - now using Gemini API

// Removed old client-side dynamic mind map generation - now using Gemini API

export const MindMapDisplay = memo(function MindMapDisplay({ playlistTitle, currentVideo, keyConceptsFromSummary, enhancedSummaryData }: MindMapDisplayProps) {
  // Performance: Reduced debug logging
  const renderCount = useRef(0);
  renderCount.current++;

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const { toast } = useToast();
  // Simplified: Remove auth dependency for mind map generation
  // const { user, isLoading: authIsLoading } = useAuth();
  
  const [allNodes, setAllNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [displayedNodes, setDisplayedNodes] = useState<Node<CollapsibleNodeData>[]>([]);
  const [displayedEdges, setDisplayedEdges] = useState<Edge[]>([]);
  
  // Start with no nodes expanded, root will be added by getVisibleNodesAndEdges if needed
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  
  // Progressive disclosure state
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [levelHistory, setLevelHistory] = useState<string[]>([]); 

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
  const fullScreenRfInstanceRef = useRef<any>(null); // Separate ref for fullscreen
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

  // Progressive disclosure navigation handler
  const handleNodeClick = useCallback((nodeId: string) => {
    const clickedNode = allNodes.find(n => n.id === nodeId);
    if (!clickedNode) return;
    
    const nodeLevel = clickedNode.data.level || 0;
    
    setIsTransitioning(true);
    
          // Progressive disclosure logic
      if (nodeLevel === currentLevel) {
        // Clicking on current level node - expand to show children
        if (clickedNode.data.childrenIds && clickedNode.data.childrenIds.length > 0) {
          setExpandedNodeIds(prev => new Set([...prev, nodeId]));
          setCurrentLevel(nodeLevel + 1);
          setLevelHistory(prev => {
            // Ensure no duplicates in history
            const newHistory = [...prev];
            if (!newHistory.includes(nodeId)) {
              newHistory.push(nodeId);
            }
            return newHistory;
          });
          setFocusedNodeId(nodeId);
        }
      } else if (nodeLevel === currentLevel + 1) {
        // Clicking on child node - move focus to this level
        setFocusedNodeId(nodeId);
        setLevelHistory(prev => {
          // Create clean history up to this level
          const newHistory = prev.slice(0, nodeLevel);
          newHistory.push(nodeId);
          return newHistory;
        });
      }
    
    setTimeout(() => setIsTransitioning(false), 800);
  }, [allNodes, currentLevel]);

  // Phase 5.2: Enhanced node data creator for consistent focus state passing
  const createEnhancedNodes = useCallback((nodes: Node<CollapsibleNodeData>[]): Node<CollapsibleNodeData>[] => {
    const relevantNodeIds = getRelevantNodeIds(focusedNodeId);
    
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onNodeClick: handleNodeClick,
        onToggleExpansion: handleToggleNodeExpansion,
        isFocused: node.id === focusedNodeId,
        isInFocusPath: relevantNodeIds.has(node.id),
        isGloballyExpanded: expandedNodeIds.has(node.id)
      }
    }));
  }, [focusedNodeId, getRelevantNodeIds, handleNodeClick, handleToggleNodeExpansion, expandedNodeIds]);

  

  // Progressive disclosure: Get visible nodes and edges based on current state
  const getVisibleNodesAndEdges = useCallback(() => {
    if (allNodes.length === 0) {
      console.log('📊 getVisibleNodesAndEdges: No nodes available');
      return { visibleNodes: [], visibleEdges: [] };
    }

    const visibleNodesAccumulator: Node<CollapsibleNodeData>[] = [];
    
    // Progressive disclosure: Show nodes based on current level and history
    const rootNode = allNodes.find(node => node.data.level === 0);
    if (!rootNode) {
      console.log('📊 getVisibleNodesAndEdges: No root node found');
      return { visibleNodes: [], visibleEdges: [] };
    }

    // Always show root node
    visibleNodesAccumulator.push(rootNode);
    const addedNodeIds = new Set([rootNode.id]);
    
    // Show nodes up to current level + 1 (to show next generation when expanded)
    for (let level = 0; level <= currentLevel + 1; level++) {
      const nodesAtLevel = allNodes.filter(node => node.data.level === level);
      
      for (const node of nodesAtLevel) {
        // Skip if already added (prevents duplicates)
        if (addedNodeIds.has(node.id)) continue;
        
        // Check if this node should be visible based on parent expansion
        const parentId = node.data.parentId;
        if (parentId && expandedNodeIds.has(parentId)) {
          visibleNodesAccumulator.push(node);
          addedNodeIds.add(node.id);
        }
      }
    }
    
    const visibleNodeIds = new Set(visibleNodesAccumulator.map(n => n.id));
    const visibleEdges = allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    ).map(edge => {
      const sourceNode = visibleNodesAccumulator.find(n => n.id === edge.source);
      const targetNode = visibleNodesAccumulator.find(n => n.id === edge.target);
      const isSourceFocused = sourceNode?.id === focusedNodeId;
      const isTargetFocused = targetNode?.id === focusedNodeId;
      const isSourceInHistory = levelHistory.includes(sourceNode?.id || '');
      const isTargetInHistory = levelHistory.includes(targetNode?.id || '');
      
      const isFocused = isSourceFocused || isTargetFocused;
      const isInFocusPath = isSourceInHistory || isTargetInHistory || isFocused;
      
      return {
        ...edge,
        type: edge.type || 'curved',
        className: '', // Remove dimming classes for better visibility
        style: {
          stroke: isFocused ? '#10b981' : '#64748b', // Green for focused, gray for others
          strokeWidth: isFocused ? 3 : 2,
          opacity: 1, // Remove transparency
        },
        data: {
          ...edge.data,
          isFocused,
          isInFocusPath
        }
      };
    });

    const enhancedVisibleNodes = createEnhancedNodes(visibleNodesAccumulator);
    
    console.log(`📊 Progressive disclosure summary:`, {
      currentLevel,
      totalNodes: allNodes.length,
      expandedNodes: expandedNodeIds.size,
      visibleNodes: enhancedVisibleNodes.length,
      levelHistory: levelHistory.length,
      focusedNodeId
    });
    
    return { visibleNodes: enhancedVisibleNodes, visibleEdges };
  }, [allNodes, allEdges, expandedNodeIds, currentLevel, levelHistory, focusedNodeId, createEnhancedNodes]);

  // Progressive disclosure layout calculation with enhanced auto-fit
  const calculateProgressiveLayout = useCallback(() => {
    if (allNodes.length === 0) return;
    
    // Get visible nodes based on current progressive disclosure state
    const { visibleNodes, visibleEdges } = getVisibleNodesAndEdges();
    
    if (visibleNodes.length === 0) return;
    
    // Enhanced layout configuration for progressive disclosure
    const progressiveLayoutOptions = {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '120', // Increased spacing for better visibility
      'elk.layered.spacing.nodeNodeBetweenLayers': '150', // More vertical space
      'elk.spacing.componentComponent': '100',
      'elk.alignment': 'CENTER',
      'elk.edgeRouting': 'POLYLINE',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.padding': '[top=80,left=80,bottom=80,right=80]', // More padding
      'elk.layered.compaction.postCompaction.strategy': 'BALANCED'
    };
    
    // Apply layout with smooth transitions
    debouncedApplyELKLayout(visibleNodes, visibleEdges, progressiveLayoutOptions, true);
    
  }, [allNodes, getVisibleNodesAndEdges, debouncedApplyELKLayout]);

  // Enhanced auto-fit function for progressive disclosure
  const autoFitProgressiveView = useCallback((forceFullscreen?: boolean) => {
    const useFullscreen = forceFullscreen || isFullScreenOpen;
    const currentInstance = useFullscreen ? fullScreenRfInstanceRef.current : rfInstanceRef.current;
    console.log(`🎯 AutoFit called: fullscreen=${useFullscreen}, instance=${!!currentInstance}, currentLevel=${currentLevel}`);
    
    if (!currentInstance) {
      console.warn('⚠️ No ReactFlow instance available for auto-fit');
      return;
    }
    
    // Get the currently visible nodes
    const { visibleNodes } = getVisibleNodesAndEdges();
    console.log(`👀 Visible nodes for level ${currentLevel}:`, visibleNodes.length);
    if (visibleNodes.length === 0) {
      console.warn('⚠️ No visible nodes for auto-fit');
      return;
    }
    
    // Different fitting strategies based on current level and node count
    const nodeCount = visibleNodes.length;
    const focusedNode = focusedNodeId ? visibleNodes.find(n => n.id === focusedNodeId) : null;
    
    // Calculate appropriate zoom and padding based on generation
    let fitOptions = {
      padding: 0.2,
      duration: 1000,
      maxZoom: 1.2,
      minZoom: 0.1
    };
    
    if (currentLevel === 0) {
      // Root level - show just the root node prominently
      fitOptions = {
        padding: 0.4,
        duration: 800,
        maxZoom: 1.5,
        minZoom: 0.3
      };
    } else if (currentLevel === 1) {
      // First generation - show root + children
      fitOptions = {
        padding: 0.25,
        duration: 800,
        maxZoom: 1.3,
        minZoom: 0.2
      };
    } else if (currentLevel >= 2) {
      // Second generation and beyond - focus on focused node and its children
      fitOptions = {
        padding: 0.15,
        duration: 800,
        maxZoom: 1.1,
        minZoom: 0.15
      };
      
      // If we have a focused node, focus on it and its immediate context
      if (focusedNode) {
        const contextNodes = visibleNodes.filter(node => {
          return node.id === focusedNodeId ||
                 node.data.parentId === focusedNodeId ||
                 node.data.parentId === focusedNode.data.parentId ||
                 (focusedNode.data.childrenIds && focusedNode.data.childrenIds.includes(node.id));
        });
        
        if (contextNodes.length > 0) {
          setTimeout(() => {
            currentInstance?.fitView({
              nodes: contextNodes,
              ...fitOptions
            });
          }, 400);
          return;
        }
      }
    }
    
    // Default fit to all visible nodes
    setTimeout(() => {
      currentInstance?.fitView({
        nodes: visibleNodes,
        ...fitOptions
      });
    }, 400);
    
  }, [focusedNodeId, currentLevel, isFullScreenOpen]);

  // Effect to handle layout calculation when progressive disclosure state changes
  useEffect(() => {
    if (allNodes.length > 0 && !isTransitioning) {
      calculateProgressiveLayout();
      // Auto-fit view after layout calculation
      const fitTimer = setTimeout(() => {
        autoFitProgressiveView();
      }, 600); // Allow time for layout to complete
      
      return () => clearTimeout(fitTimer);
    }
  }, [currentLevel, expandedNodeIds, focusedNodeId, allNodes, isTransitioning, calculateProgressiveLayout]);

  // Separate effect to handle auto-fitting when focus changes
  useEffect(() => {
    if (focusedNodeId && allNodes.length > 0 && !isTransitioning) {
      const fitTimer = setTimeout(() => {
        autoFitProgressiveView();
      }, 100);
      
      return () => clearTimeout(fitTimer);
    }
  }, [focusedNodeId]);

  // Effect to handle auto-fitting when switching to/from fullscreen
  useEffect(() => {
    if (displayedNodes.length > 0) {
      console.log(`🖥️ Fullscreen state changed to: ${isFullScreenOpen}, triggering auto-fit for ${displayedNodes.length} nodes`);
      const fitTimer = setTimeout(() => {
        autoFitProgressiveView(isFullScreenOpen);
      }, 200); // Give time for fullscreen transition
      
      return () => clearTimeout(fitTimer);
    }
  }, [isFullScreenOpen]);





  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setDisplayedNodes((nds) => applyNodeChanges(changes, nds)),
    [setDisplayedNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setDisplayedEdges((eds) => applyEdgeChanges(changes, eds)),
    [setDisplayedEdges]
  );

    const loadMindMapData = useCallback(async () => {
    if (!currentVideo) {
      console.log('⚠️ No current video available for mind map generation');
      setIsLoading(false);
      setGeneratedTitle("No Video Selected");
      return;
    }

    setIsLoading(true);
    setGeneratedTitle("Generating AI Mind Map...");
    
    try {
      // Extract video ID from the current video
      let videoId = currentVideo.id;
      
      console.log('🔍 Current video data:', {
        id: currentVideo.id,
        title: currentVideo.title,
        youtubeURL: currentVideo.youtubeURL
      });
      
      // Handle different possible formats:
      // 1. Direct video ID (11 characters)
      // 2. URL format with video ID
      // 3. Playlist format that might contain video ID
      if (currentVideo?.youtubeURL?.includes('watch?v=')) {
        videoId = currentVideo.youtubeURL.split('watch?v=')[1].split('&')[0];
      } else if (currentVideo?.youtubeURL?.includes('youtu.be/')) {
        videoId = currentVideo.youtubeURL.split('youtu.be/')[1].split('?')[0];
      } else if (currentVideo?.youtubeURL?.includes('youtube.com/watch?v=')) {
        videoId = currentVideo.youtubeURL.split('youtube.com/watch?v=')[1].split('&')[0];
      } else if (currentVideo?.id?.length === 11) {
        // Already a valid YouTube video ID
        videoId = currentVideo.id;
      } else {
        // Try to extract from any URL format or use as-is
        const urlMatch = currentVideo?.youtubeURL?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (urlMatch) {
          videoId = urlMatch[1];
        } else {
          console.warn('⚠️ Could not extract valid YouTube video ID from:', currentVideo);
          // Use the original value and let backend handle it
          videoId = currentVideo?.id;
        }
      }
      
      console.log('🎯 Extracted video ID:', videoId);
      
      // Use a default user ID for transcript processing
      const defaultUserId = 'default_user';
      
      console.log('🧠 Starting Gemini-powered mind map generation for:', { videoId, userId: defaultUserId });
      
      toast({
        title: "🤖 AI Analysis Starting",
        description: "Gemini AI is analyzing the video transcript to generate your mind map...",
      });

      // Call the new Gemini-powered mind map service with default user
      const mindMapResponse = await mindMapService.generateMindMap(videoId, defaultUserId);
      
      if (!mindMapResponse.success || !mindMapResponse.mindmap_data) {
        throw new Error('Invalid mind map response from server');
      }

      const { nodes: generatedNodes, edges: generatedEdges } = mindMapResponse.mindmap_data;
      
      console.log('✅ Received Gemini-generated mind map:', {
        nodeCount: generatedNodes.length,
        edgeCount: generatedEdges.length,
        videoTitle: mindMapResponse.video_title
      });
      
      // Find the root node and initialize progressive disclosure
      const rootNode = generatedNodes.find((node: any) => node.data.level === 0);
      if (rootNode) {
        // Start with only root node visible (not expanded)
        setExpandedNodeIds(new Set());
        setCurrentLevel(0);
        // Ensure clean initialization of level history
        setLevelHistory([rootNode.id]);
        setFocusedNodeId(rootNode.id);
        // Clear any existing focus history
        setFocusHistory([rootNode.id]);
        
        // Auto-fit to root node after everything is set up
        setTimeout(() => {
          autoFitProgressiveView();
        }, 1000);
      }
      
      setAllNodes(generatedNodes);
      setAllEdges(generatedEdges);
      setGeneratedTitle(mindMapResponse.video_title || currentVideo.title || playlistTitle || 'AI-Generated Mind Map');

        toast({ 
        title: "🧠 AI Mind Map Generated!", 
        description: `Successfully created mind map with ${generatedNodes.length} concepts and ${generatedEdges.length} connections.`
      });

    } catch (error: any) {
      console.error("❌ Error generating Gemini mind map:", error);
      
      let errorMessage = "Could not generate AI mind map.";
      let errorDescription = "Please try again or check if the video has been processed.";
      
      if (error.message?.includes("404")) {
        errorMessage = "Video Not Processed";
        errorDescription = "Please ensure the video transcript has been processed first.";
      } else if (error.message?.includes("Gemini AI service not available")) {
        errorMessage = "AI Service Unavailable";
        errorDescription = "The AI service is currently unavailable. Please try again later.";
      } else if (error.message?.includes("No transcript available")) {
        errorMessage = "No Transcript Available";
        errorDescription = "This video doesn't have a transcript. Please try a different video.";
      }
      
      setGeneratedTitle("AI Mind Map Generation Failed");
      setIsLoading(false);
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      // setIsLoading(false); // Will be set to false after layout in useEffect
    }
  }, [playlistTitle, currentVideo, toast]);

  useEffect(() => {
    // Simplified: Load mind map data directly without auth checks
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
            handleNodeClick(rootNode.id);
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
            handleNodeClick(focusedNode.data.childrenIds[0]);
            event.preventDefault();
          }
          break;
          
        case 'ArrowLeft':
          // Navigate to parent (horizontal model: left = shallower)
          if (focusedNode.data.parentId) {
            handleNodeClick(focusedNode.data.parentId);
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
                handleNodeClick(parentNode.data.childrenIds[newIndex]);
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
            handleNodeClick(rootNode.id);
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
            handleNodeClick(deepestNode.id);
            event.preventDefault();
          }
          break;

        case 'PageUp':
          // Navigate to first sibling
          if (focusedNode.data.parentId) {
            const parentNode = allNodes.find(n => n.id === focusedNode.data.parentId);
            if (parentNode?.data.childrenIds && parentNode.data.childrenIds.length > 0) {
              handleNodeClick(parentNode.data.childrenIds[0]);
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
              handleNodeClick(lastChildId);
              event.preventDefault();
            }
          }
          break;

        case 'Backspace':
          // Navigate back in focus history
          if (focusHistory.length > 1) {
            const previousNodeId = focusHistory[focusHistory.length - 2];
            handleNodeClick(previousNodeId);
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
            handleNodeClick(focusedNode.data.childrenIds[childIndex]);
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
  }, [focusedNodeId, allNodes, handleNodeClick, handleToggleNodeExpansion, expandedNodeIds, focusHistory]);

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
        // Show mind map generation loading state
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <BrainIcon className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="mt-8 text-center space-y-3 max-w-lg">
            <h3 className="text-xl font-semibold text-white">🤖 Gemini AI Analyzing...</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Our AI is reading through the video transcript and creating a comprehensive mind map structure with themes, concepts, and relationships.
            </p>
            <div className="flex items-center justify-center space-x-6 mt-6 text-xs text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Analyzing transcript</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Identifying themes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span>Building structure</span>
              </div>
            </div>
          </div>
         </div>
      ) : displayedNodes.length === 0 ? (
        // Show ready for generation state (when not loading)
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
              <h3 className="text-xl font-semibold text-white">
                {currentVideo ? "Ready for AI Mind Map" : "No Video Selected"}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {currentVideo ? (
                  <>
                    Click the <span className="font-medium text-primary">"Regenerate"</span> button above to create an AI-powered mind map from this video's content.
                  </>
                ) : (
                  "Please select a video from the playlist to generate an AI mind map."
                )}
              </p>
              {currentVideo && (
                <div className="text-xs text-muted-foreground/80 space-y-1">
                  <p>🤖 Powered by Gemini AI for intelligent analysis</p>
                  <p>🧠 Automatically extracts key concepts and themes</p>
                  <p>🗺️ Creates interactive hierarchical knowledge maps</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={(() => {
            const enhancedNodes = createEnhancedNodes(displayedNodes);
            // Defensive programming: ensure no duplicate node IDs
            const uniqueNodes = enhancedNodes.filter((node, index, arr) => 
              arr.findIndex(n => n.id === node.id) === index
            );
            if (enhancedNodes.length !== uniqueNodes.length) {
              console.warn('Duplicate nodes detected and removed:', enhancedNodes.length - uniqueNodes.length);
            }
            return uniqueNodes;
          })()} // Phase 5.2: Use enhanced node data with duplicate protection
          edges={(() => {
            const processedEdges = displayedEdges.map(edge => ({
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
            }));
            // Ensure no duplicate edge IDs
            const uniqueEdges = processedEdges.filter((edge, index, arr) => 
              arr.findIndex(e => e.id === edge.id) === index
            );
            if (processedEdges.length !== uniqueEdges.length) {
              console.warn('Duplicate edges detected and removed:', processedEdges.length - uniqueEdges.length);
            }
            return uniqueEdges;
          })()}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes} // Phase 4.2: Add custom curved edge types
          onNodeClick={(event, node) => {
            // Progressive disclosure: Integrate with node clicks
            event.preventDefault();
            handleNodeClick(node.id);
          }}
          onPaneClick={(event) => {
            // Phase 5.1: Clear focus when clicking on empty space
            if (!event.defaultPrevented) {
              setFocusedNodeId(null);
              setFocusHistory([]);
            }
          }}
          onInit={(instance) => {
            if (isFullScreenContext) {
              fullScreenRfInstanceRef.current = instance;
            } else {
              rfInstanceRef.current = instance;
              setRfInstance(instance);
            }
            
            // Initial fit after ReactFlow is ready
            setTimeout(() => {
              if (displayedNodes.length > 0) {
                autoFitProgressiveView(isFullScreenContext);
              }
            }, 100);
          }}
          fitView={false}
          fitViewOptions={{ padding: 0.2, duration: 800, maxZoom: 1.2 }}
          minZoom={0.05}
          maxZoom={2.5}
          className="bg-gray-900 transition-all duration-700 ease-in-out"
          proOptions={{ hideAttribution: true }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          attributionPosition="bottom-left"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
            gap={28} 
            size={1.2}
            color="#4a5568" 
            className="opacity-100"
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
            maskColor="rgb(60, 60, 60)"
            pannable zoomable
            />
            




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
                {!currentVideo ? 'Select a video to generate an AI mind map' :
                 isLoading && displayedNodes.length === 0 ? 'Gemini AI is analyzing the video transcript and creating your mind map...' : 
                 displayedNodes.length === 0 ? 'Click "Regenerate" to generate your AI-powered mind map' : 
                 'Interactive AI-Generated Mind Map powered by Gemini'}
              </CardDescription>
              
              {/* Progressive disclosure breadcrumb */}
              {levelHistory.length > 1 && allNodes.length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Path:</span>
                  {levelHistory.map((nodeId, index) => {
                     const node = allNodes.find(n => n.id === nodeId);
                     const isLast = index === levelHistory.length - 1;
                     const isClickable = index < levelHistory.length - 1;
                     
                     return (
                       <React.Fragment key={`breadcrumb-${index}-${nodeId}`}>
                         <button
                           className={`px-2 py-1 rounded text-xs transition-colors ${
                             isLast 
                               ? 'bg-primary/20 text-primary' 
                               : isClickable
                                 ? 'hover:bg-primary/10 cursor-pointer text-muted-foreground hover:text-primary'
                                 : 'cursor-default'
                           }`}
                           onClick={() => {
                             if (isClickable) {
                               // Navigate back to this level
                               setCurrentLevel(index);
                               setLevelHistory(prev => prev.slice(0, index + 1));
                               setFocusedNodeId(nodeId);
                               // Remove expansions beyond this level
                               const nodesToKeepExpanded = new Set<string>();
                               for (let i = 0; i <= index; i++) {
                                 if (levelHistory[i]) {
                                   nodesToKeepExpanded.add(levelHistory[i]);
                                 }
                               }
                               setExpandedNodeIds(nodesToKeepExpanded);
                               
                               // Auto-fit after navigation
                               setTimeout(() => {
                                 autoFitProgressiveView();
                               }, 200);
                             }
                           }}
                           disabled={!isClickable}
                         >
                           {node?.data.label?.substring(0, 15) || 'Unknown'}
                           {node?.data.label && node.data.label.length > 15 && '...'}
                         </button>
                         {!isLast && <span className="text-muted-foreground/50">→</span>}
                       </React.Fragment>
                     );
                  })}
                </div>
              )}
            </div>
        </div>
          
          {!isLoading && currentVideo && (
            <div className="flex items-center space-x-2">
              {displayedNodes.length > 0 && (
                <>
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
                </>
              )}
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
    prevProps.currentVideo === nextProps.currentVideo &&
    JSON.stringify(prevProps.keyConceptsFromSummary) === JSON.stringify(nextProps.keyConceptsFromSummary) &&
    JSON.stringify(prevProps.enhancedSummaryData) === JSON.stringify(nextProps.enhancedSummaryData)
  );
});

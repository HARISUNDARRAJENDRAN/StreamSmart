'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Eye, Mic, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MindMapNode {
  id: string;
  label: string;
  type: 'main' | 'topic' | 'subtopic' | 'insight' | 'visual' | 'temporal';
  position: { x: number; y: number };
  confidence?: number;
  timestamp?: number;
  visualEvidence?: string;
  audioEvidence?: string;
  connections: string[];
  metadata?: {
    source: 'transcript' | 'visual' | 'multimodal' | 'ai_inference';
    importance: number;
    keywords: string[];
  };
}

interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  type: 'hierarchical' | 'temporal' | 'semantic' | 'visual_alignment';
  strength: number;
  label?: string;
}

interface ProcessingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  description: string;
  icon: React.ReactNode;
}

interface EnhancedMindMapProps {
  videoId: string;
  title: string;
  isProcessing?: boolean;
  multiModalData?: any;
  onNodeClick?: (node: MindMapNode) => void;
  className?: string;
}

export function EnhancedMindMap({ 
  videoId, 
  title, 
  isProcessing = false, 
  multiModalData,
  onNodeClick,
  className 
}: EnhancedMindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<MindMapConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    {
      name: "Audio Transcription",
      status: 'pending',
      progress: 0,
      description: "Extracting speech using Whisper AI",
      icon: <Mic className="h-4 w-4" />
    },
    {
      name: "Visual Analysis", 
      status: 'pending',
      progress: 0,
      description: "Understanding visual content with CLIP",
      icon: <Eye className="h-4 w-4" />
    },
    {
      name: "Temporal Alignment",
      status: 'pending', 
      progress: 0,
      description: "Synchronizing audio and visual elements",
      icon: <Clock className="h-4 w-4" />
    },
    {
      name: "AI Synthesis",
      status: 'pending',
      progress: 0,
      description: "Generating insights with FLAN-T5",
      icon: <Brain className="h-4 w-4" />
    }
  ]);

  // Simulate processing stages
  useEffect(() => {
    if (!isProcessing) return;

    const updateProcessing = async () => {
      const stages = [...processingStages];
      
      for (let i = 0; i < stages.length; i++) {
        stages[i].status = 'processing';
        setProcessingStages([...stages]);
        
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 20) {
          stages[i].progress = progress;
          setProcessingStages([...stages]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        stages[i].status = 'completed';
        setProcessingStages([...stages]);
      }
    };

    updateProcessing();
  }, [isProcessing]);

  // Generate mind map from multimodal data
  useEffect(() => {
    if (multiModalData && !isProcessing) {
      generateMindMapFromData(multiModalData);
    }
  }, [multiModalData, isProcessing]);

  const generateMindMapFromData = (data: any) => {
    const centerX = 400;
    const centerY = 300;
    const newNodes: MindMapNode[] = [];
    const newConnections: MindMapConnection[] = [];

    // Central node
    newNodes.push({
      id: 'central',
      label: title,
      type: 'main',
      position: { x: centerX, y: centerY },
      confidence: 1.0,
      connections: [],
      metadata: {
        source: 'multimodal',
        importance: 1.0,
        keywords: []
      }
    });

    // Key topics from summary
    if (data.key_topics) {
      data.key_topics.forEach((topic: string, index: number) => {
        const angle = (index * 2 * Math.PI) / data.key_topics.length;
        const radius = 150;
        const nodeId = `topic-${index}`;
        
        newNodes.push({
          id: nodeId,
          label: topic,
          type: 'topic',
          position: {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          },
          confidence: 0.9,
          connections: ['central'],
          metadata: {
            source: 'ai_inference',
            importance: 0.8,
            keywords: [topic]
          }
        });

        newConnections.push({
          id: `central-${nodeId}`,
          from: 'central',
          to: nodeId,
          type: 'hierarchical',
          strength: 0.9,
          label: 'main topic'
        });
      });
    }

    // Visual insights
    if (data.visual_insights) {
      data.visual_insights.forEach((insight: string, index: number) => {
        const parentTopicIndex = index % (data.key_topics?.length || 1);
        const parentId = `topic-${parentTopicIndex}`;
        const nodeId = `visual-${index}`;
        
        const parentNode = newNodes.find(n => n.id === parentId);
        if (parentNode) {
          const angle = Math.random() * 2 * Math.PI;
          const radius = 80;
          
          newNodes.push({
            id: nodeId,
            label: insight,
            type: 'visual',
            position: {
              x: parentNode.position.x + Math.cos(angle) * radius,
              y: parentNode.position.y + Math.sin(angle) * radius
            },
            confidence: 0.7,
            visualEvidence: insight,
            connections: [parentId],
            metadata: {
              source: 'visual',
              importance: 0.6,
              keywords: insight.split(' ').slice(0, 3)
            }
          });

          newConnections.push({
            id: `${parentId}-${nodeId}`,
            from: parentId,
            to: nodeId,
            type: 'visual_alignment',
            strength: 0.7,
            label: 'visual evidence'
          });
        }
      });
    }

    // Timestamp highlights
    if (data.timestamp_highlights) {
      data.timestamp_highlights.forEach((highlight: any, index: number) => {
        const nodeId = `timestamp-${index}`;
        const radius = 200 + index * 30;
        const angle = (index * 2 * Math.PI) / data.timestamp_highlights.length;
        
        newNodes.push({
          id: nodeId,
          label: highlight.description || `Key moment at ${highlight.timestamp}s`,
          type: 'temporal',
          position: {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          },
          confidence: highlight.confidence || 0.8,
          timestamp: highlight.timestamp,
          connections: ['central'],
          metadata: {
            source: 'multimodal',
            importance: highlight.confidence || 0.8,
            keywords: []
          }
        });

        newConnections.push({
          id: `central-${nodeId}`,
          from: 'central',
          to: nodeId,
          type: 'temporal',
          strength: highlight.confidence || 0.8,
          label: `${highlight.timestamp}s`
        });
      });
    }

    setNodes(newNodes);
    setConnections(newConnections);
  };

  const handleNodeClick = (node: MindMapNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  const getNodeGradient = (node: MindMapNode) => {
    switch (node.type) {
      case 'main': return 'url(#mainGradient)';
      case 'topic': return 'url(#topicGradient)';
      case 'visual': return 'url(#visualGradient)';
      case 'temporal': return 'url(#temporalGradient)';
      case 'insight': return 'url(#insightGradient)';
      default: return 'url(#defaultGradient)';
    }
  };

  const getConnectionColor = (connection: MindMapConnection) => {
    switch (connection.type) {
      case 'hierarchical': return '#3b82f6';
      case 'visual_alignment': return '#f59e0b';
      case 'temporal': return '#ef4444';
      case 'semantic': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderProcessingStages = () => (
    <div className="space-y-4">
      {processingStages.map((stage, index) => (
        <div key={index} className="relative">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shadow-lg",
              stage.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
              stage.status === 'processing' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
              stage.status === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' :
              'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
            )}>
              {stage.status === 'processing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                stage.icon
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-base">{stage.name}</span>
                <span className="text-sm font-medium text-muted-foreground">{stage.progress}%</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{stage.description}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-500 ease-out",
                    stage.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    stage.status === 'processing' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  )}
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            </div>
          </div>
          {stage.status === 'processing' && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );

  if (isProcessing || nodes.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Enhanced Mind Map
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div>
              <p className="text-muted-foreground mb-4">
                Processing video with multi-modal AI analysis...
              </p>
              {renderProcessingStages()}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start video processing to generate an AI-enhanced mind map</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Enhanced Mind Map
            <Badge variant="secondary" className="text-xs">Multi-Modal</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            >
              -
            </Button>
            <span className="text-sm text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            >
              +
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 shadow-lg">
          <svg
            ref={svgRef}
            width="800"
            height="600"
            viewBox="0 0 800 600"
            className="w-full h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f093fb" />
                <stop offset="100%" stopColor="#f5576c" />
              </linearGradient>
              <linearGradient id="topicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
              <linearGradient id="visualGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffecd2" />
                <stop offset="100%" stopColor="#fcb69f" />
              </linearGradient>
              <linearGradient id="temporalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9a9e" />
                <stop offset="100%" stopColor="#fecfef" />
              </linearGradient>
              <linearGradient id="insightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a8edea" />
                <stop offset="100%" stopColor="#fed6e3" />
              </linearGradient>
              <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4facfe" />
                <stop offset="100%" stopColor="#00f2fe" />
              </linearGradient>
              
              {/* Shadow filters */}
              <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>

            {/* Background pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connections */}
            {connections.map((connection) => {
              const fromNode = nodes.find(n => n.id === connection.from);
              const toNode = nodes.find(n => n.id === connection.to);
              if (!fromNode || !toNode) return null;

              return (
                <g key={connection.id}>
                  <line
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    stroke={getConnectionColor(connection)}
                    strokeWidth={connection.strength * 4}
                    strokeOpacity={0.8}
                    strokeDasharray={connection.type === 'temporal' ? '8,4' : ''}
                    filter="url(#dropshadow)"
                    className="transition-all duration-300"
                  />
                  {connection.label && (
                    <text
                      x={(fromNode.position.x + toNode.position.x) / 2}
                      y={(fromNode.position.y + toNode.position.y) / 2 - 5}
                      fontSize="11"
                      fill="#374151"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-medium"
                      style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                    >
                      {connection.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const radius = node.type === 'main' ? 35 : node.type === 'topic' ? 25 : 18;
              
              return (
                <g key={node.id} className="cursor-pointer">
                  {/* Node shadow */}
                  <circle
                    cx={node.position.x + 2}
                    cy={node.position.y + 4}
                    r={radius}
                    fill="rgba(0,0,0,0.1)"
                    opacity={0.3}
                  />
                  
                  {/* Main node */}
                  <circle
                    cx={node.position.x}
                    cy={node.position.y}
                    r={radius}
                    fill={getNodeGradient(node)}
                    stroke={isSelected ? '#000' : '#fff'}
                    strokeWidth={isSelected ? 4 : 3}
                    opacity={node.confidence || 1}
                    className="transition-all duration-300 hover:stroke-gray-800 hover:stroke-4"
                    onClick={() => handleNodeClick(node)}
                    filter="url(#dropshadow)"
                  />
                  
                  {/* Node text */}
                  <text
                    x={node.position.x}
                    y={node.position.y + radius + 20}
                    fontSize="13"
                    fill="#1f2937"
                    textAnchor="middle"
                    className="cursor-pointer font-semibold"
                    onClick={() => handleNodeClick(node)}
                    style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                  >
                    {node.label.length > 18 ? node.label.substring(0, 18) + '...' : node.label}
                  </text>
                  
                  {/* Confidence indicator */}
                  {node.confidence && (
                    <text
                      x={node.position.x}
                      y={node.position.y + radius + 35}
                      fontSize="10"
                      fill="#6b7280"
                      textAnchor="middle"
                      className="font-medium"
                    >
                      {Math.round(node.confidence * 100)}%
                    </text>
                  )}
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <circle
                      cx={node.position.x}
                      cy={node.position.y}
                      r={radius + 8}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              if (!node) return null;

              return (
                <div>
                  <h4 className="font-medium mb-2">{node.label}</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline">{node.type}</Badge>
                    <Badge variant="outline">{node.metadata?.source}</Badge>
                    {node.confidence && (
                      <Badge variant="outline">{Math.round(node.confidence * 100)}% confidence</Badge>
                    )}
                  </div>
                  {node.timestamp && (
                    <p className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Timestamp: {node.timestamp}s
                    </p>
                  )}
                  {node.visualEvidence && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <Eye className="h-3 w-3 inline mr-1" />
                      Visual: {node.visualEvidence}
                    </p>
                  )}
                  {node.metadata?.keywords && node.metadata.keywords.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Keywords: </span>
                      {node.metadata.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="text-xs mr-1">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Main Topic</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Key Topics</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Visual Insights</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Temporal Events</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
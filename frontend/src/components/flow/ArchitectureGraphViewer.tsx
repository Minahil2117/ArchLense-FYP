"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  NodeMouseHandler,
  EdgeMouseHandler,
  OnNodesChange,
} from "@xyflow/react";
import {
  RotateCcw,
  Maximize2,
  X,
  Layers,
  Sparkles,
  ArrowRightLeft,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import { ArchitectureGraph, Finding, NodeType } from "@/types/architecture";
import { CustomArchitectureNode } from "./CustomArchitectureNode";
import { CustomArchitectureEdge } from "./CustomArchitectureEdge";
import { NodeDetailsDrawer } from "./NodeDetailsDrawer";
import { convertArchitectureGraphToReactFlow } from "./graphAdapter";
import {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  CustomNodeType,
  CustomEdgeType,
} from "./types";

interface ArchitectureGraphViewerProps {
  graph: ArchitectureGraph | null | undefined;
  highlightedNodeIds?: string[];
  selectedFinding?: Finding | null;
  onClearHighlight?: () => void;
  onSelectNode?: (nodeId: string) => void;
  findings?: Finding[];
}

const nodeTypes = {
  architectureNode: CustomArchitectureNode,
};

const edgeTypes = {
  architectureEdge: CustomArchitectureEdge,
};

function miniMapNodeColor(node: CustomNodeType): string {
  const type = (node.data as ArchitectureNodeData)?.type as NodeType;
  switch (type) {
    case "database":
      return "#10b981"; // emerald
    case "api_gateway":
      return "#a855f7"; // purple
    case "cache":
      return "#f59e0b"; // amber
    case "message_broker":
      return "#06b6d4"; // cyan
    case "client":
      return "#38bdf8"; // sky
    case "external_service":
      return "#f43f5e"; // rose
    case "service":
    default:
      return "#6366f1"; // indigo
  }
}

function InnerGraphViewer({
  graph,
  highlightedNodeIds = [],
  selectedFinding = null,
  onClearHighlight,
  onSelectNode,
  findings = [],
}: ArchitectureGraphViewerProps) {
  const { fitView } = useReactFlow();

  const [direction, setDirection] = useState<"LR" | "TB">("LR");
  const [selectedNodeData, setSelectedNodeData] = useState<ArchitectureNodeData | null>(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState<ArchitectureEdgeData | null>(null);

  // Store user-dragged positions so dragging doesn't reset on highlight toggling
  const [userPositions, setUserPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Build mapping of finding rule IDs per node
  const findingLabelsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    findings.forEach((f) => {
      f.affected_nodes.forEach((nodeId) => {
        const existing = map.get(nodeId) || [];
        if (!existing.includes(f.rule_id)) {
          existing.push(f.rule_id);
          map.set(nodeId, existing);
        }
      });
    });
    return map;
  }, [findings]);

  // Convert graph to React Flow format
  const initialConversion = useMemo(() => {
    return convertArchitectureGraphToReactFlow({
      graph,
      highlightedNodeIds,
      selectedNodeId: selectedNodeData?.id,
      existingPositions: userPositions.size > 0 ? userPositions : undefined,
      layoutOptions: { direction },
      findingLabelsMap,
    });
  }, [graph, highlightedNodeIds, selectedNodeData?.id, direction, findingLabelsMap, userPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialConversion.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialConversion.edges);

  // Sync state when conversion changes
  useEffect(() => {
    setNodes(initialConversion.nodes);
    setEdges(initialConversion.edges);
  }, [initialConversion, setNodes, setEdges]);

  // Track position changes when user drags nodes
  const handleNodesChange: OnNodesChange<CustomNodeType> = useCallback(
    (changes) => {
      onNodesChange(changes);
      setUserPositions((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const c of changes) {
          if (c.type === "position" && c.position && c.id) {
            next.set(c.id, c.position);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [onNodesChange]
  );

  // Auto fit view on graph change or highlighted nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        if (highlightedNodeIds.length > 0) {
          // Focus affected nodes
          const targetNodes = nodes.filter((n) =>
            highlightedNodeIds.some(
              (id) => id.toLowerCase().trim() === n.id.toLowerCase().trim()
            )
          );
          if (targetNodes.length > 0) {
            fitView({
              nodes: targetNodes,
              padding: 0.35,
              duration: 500,
            });
            return;
          }
        }
        fitView({ padding: 0.2, duration: 400 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [graph, highlightedNodeIds, fitView, nodes]);

  // Handle node selection
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const archNode = node.data as ArchitectureNodeData;
      setSelectedNodeData(archNode);
      setSelectedEdgeData(null);
      if (onSelectNode) {
        onSelectNode(archNode.id);
      }
    },
    [onSelectNode]
  );

  // Handle edge selection
  const handleEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    const archEdge = edge.data as ArchitectureEdgeData;
    setSelectedEdgeData(archEdge);
    setSelectedNodeData(null);
  }, []);

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedNodeData(null);
    setSelectedEdgeData(null);
  }, []);

  // Reset layout to auto-calculated coordinates
  const handleResetLayout = useCallback(() => {
    setUserPositions(new Map());
    const fresh = convertArchitectureGraphToReactFlow({
      graph,
      highlightedNodeIds,
      selectedNodeId: selectedNodeData?.id,
      layoutOptions: { direction },
      findingLabelsMap,
    });
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [graph, highlightedNodeIds, selectedNodeData?.id, direction, findingLabelsMap, fitView, setNodes, setEdges]);

  // Calculate incoming and outgoing connections for inspector drawer
  const { incomingNodes, outgoingNodes } = useMemo(() => {
    if (!selectedNodeData || !graph || !graph.edges) {
      return { incomingNodes: [], outgoingNodes: [] };
    }
    const incoming: string[] = [];
    const outgoing: string[] = [];

    graph.edges.forEach((e) => {
      if (e.target.toLowerCase() === selectedNodeData.id.toLowerCase()) {
        incoming.push(e.source);
      }
      if (e.source.toLowerCase() === selectedNodeData.id.toLowerCase()) {
        outgoing.push(e.target);
      }
    });

    return { incomingNodes: incoming, outgoingNodes: outgoing };
  }, [selectedNodeData, graph]);

  // Toggle layout orientation (LR vs TB)
  const toggleDirection = useCallback(() => {
    setUserPositions(new Map());
    setDirection((prev) => (prev === "LR" ? "TB" : "LR"));
  }, []);

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="w-full h-full min-h-[420px] bg-slate-950/40 rounded-xl border border-slate-800 p-8 flex flex-col justify-center items-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-3 shadow-sm">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">No Architecture Topology Loaded</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          Select a benchmark scenario from the dropdown above or enter Mermaid syntax to render an interactive architecture diagram.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[480px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner flex flex-col">
      {/* Top Action Toolbar */}
      <div className="h-10 px-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs z-10 select-none">
        {/* Left: Graph Metrics Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-indigo-300 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            {nodes.length} Components
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
            {edges.length} Relationships
          </span>
        </div>

        {/* Center: Active Finding Banner if highlighted */}
        {selectedFinding && (
          <div className="hidden sm:flex items-center space-x-2 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-in fade-in">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold">{selectedFinding.rule_id}:</span>
            <span className="truncate max-w-[200px]">{selectedFinding.title}</span>
            {onClearHighlight && (
              <button
                onClick={onClearHighlight}
                className="ml-1 p-0.5 hover:bg-rose-500/20 rounded text-rose-200"
                title="Clear Highlighting"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Right: View Controls */}
        <div className="flex items-center space-x-1">
          {/* Orientation Toggle */}
          <button
            onClick={toggleDirection}
            className="flex items-center space-x-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={`Toggle Layout: Currently ${direction === "LR" ? "Left-to-Right" : "Top-to-Bottom"}`}
          >
            {direction === "LR" ? (
              <ArrowRightLeft className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-mono">{direction}</span>
          </button>

          {/* Reset Layout */}
          <button
            onClick={handleResetLayout}
            className="flex items-center space-x-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to Calculated Hierarchy"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px]">Reset</span>
          </button>

          {/* Fit View */}
          <button
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            className="flex items-center space-x-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fit Diagram in Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">Fit</span>
          </button>

          {/* Clear Highlighting button */}
          {highlightedNodeIds.length > 0 && onClearHighlight && (
            <button
              onClick={onClearHighlight}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition-colors"
              title="Clear active finding highlight"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[10px]">Clear Highlight</span>
            </button>
          )}
        </div>
      </div>

      {/* React Flow Canvas Container */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          className="bg-slate-950"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls
            className="!bg-slate-900 !border !border-slate-800 !rounded-lg !shadow-xl !fill-slate-300 [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button:hover]:!bg-slate-800"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-slate-950/90 !border !border-slate-800 !rounded-lg overflow-hidden !shadow-lg"
            nodeColor={miniMapNodeColor}
            maskColor="rgba(15, 23, 42, 0.75)"
            zoomable
            pannable
          />

          {/* Instructions Overlay Helper */}
          <Panel position="bottom-left" className="m-3">
            <div className="px-2.5 py-1.5 rounded-md bg-slate-900/80 border border-slate-800/80 backdrop-blur-md text-[10px] text-slate-400 select-none shadow-sm flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Drag nodes to reposition • Click to inspect • Click finding to highlight</span>
            </div>
          </Panel>
        </ReactFlow>

        {/* Selected Component Inspector Drawer */}
        <NodeDetailsDrawer
          selectedNode={selectedNodeData}
          selectedEdge={selectedEdgeData}
          findings={findings}
          incomingNodes={incomingNodes}
          outgoingNodes={outgoingNodes}
          onClose={() => {
            setSelectedNodeData(null);
            setSelectedEdgeData(null);
          }}
          onSelectNode={(nodeId) => {
            const target = nodes.find((n) => n.id.toLowerCase() === nodeId.toLowerCase());
            if (target) {
              setSelectedNodeData(target.data as ArchitectureNodeData);
              setSelectedEdgeData(null);
            }
          }}
        />
      </div>
    </div>
  );
}

export function ArchitectureGraphViewer(props: ArchitectureGraphViewerProps) {
  return (
    <ReactFlowProvider>
      <InnerGraphViewer {...props} />
    </ReactFlowProvider>
  );
}

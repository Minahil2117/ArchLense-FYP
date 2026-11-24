import { MarkerType } from "@xyflow/react";
import { ArchitectureGraph, Node as ArchNode } from "@/types/architecture";
import {
  CustomNodeType,
  CustomEdgeType,
  ArchitectureNodeData,
  ArchitectureEdgeData,
  HighlightState,
  GraphLayoutOptions,
} from "./types";
import { calculateArchitectureLayout } from "./graphLayout";

export interface ConvertGraphParams {
  graph: ArchitectureGraph | null | undefined;
  highlightedNodeIds?: string[];
  selectedNodeId?: string | null;
  existingPositions?: Map<string, { x: number; y: number }>;
  layoutOptions?: GraphLayoutOptions;
  findingLabelsMap?: Map<string, string[]>;
}

export interface ConvertGraphResult {
  nodes: CustomNodeType[];
  edges: CustomEdgeType[];
  nodeCount: number;
  edgeCount: number;
}

/**
 * Normalizes an ID for case-insensitive matching while preserving the original ID.
 */
function normalizeId(id: string): string {
  return (id || "").toLowerCase().trim();
}

/**
 * Converts a backend canonical ArchitectureGraph into React Flow nodes and edges.
 * Handles missing nodes, cycles, and finding-based highlighting deterministically.
 */
export function convertArchitectureGraphToReactFlow({
  graph,
  highlightedNodeIds = [],
  selectedNodeId = null,
  existingPositions,
  layoutOptions,
  findingLabelsMap,
}: ConvertGraphParams): ConvertGraphResult {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return { nodes: [], edges: [], nodeCount: 0, edgeCount: 0 };
  }

  // 1. Deduplicate nodes by ID and filter invalid entries
  const nodeMap = new Map<string, ArchNode>();
  graph.nodes.forEach((n) => {
    if (n && n.id && !nodeMap.has(n.id)) {
      nodeMap.set(n.id, n);
    }
  });

  const validNodes = Array.from(nodeMap.values());

  // 2. Filter edges to ensure both source and target exist in nodeMap
  const validEdges = (graph.edges || []).filter(
    (e) => e && e.source && e.target && nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  // 3. Calculate degrees
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  validNodes.forEach((n) => {
    inDegreeMap.set(n.id, 0);
    outDegreeMap.set(n.id, 0);
  });

  validEdges.forEach((e) => {
    outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
    inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
  });

  // 4. Calculate layout positions if not already provided
  const autoPositions = calculateArchitectureLayout(validNodes, validEdges, layoutOptions);

  // 5. Build normalized highlight set
  const normalizedHighlightSet = new Set<string>(
    highlightedNodeIds.map(normalizeId)
  );
  const isHighlightModeActive = normalizedHighlightSet.size > 0;

  // 6. Map nodes to React Flow nodes
  const rfNodes: CustomNodeType[] = validNodes.map((n) => {
    const isHighlighted = normalizedHighlightSet.has(normalizeId(n.id));
    const isSelected = selectedNodeId === n.id;

    let highlightState: HighlightState = "normal";
    if (isHighlightModeActive) {
      highlightState = isHighlighted ? "highlighted" : "dimmed";
    }

    const pos =
      existingPositions?.get(n.id) ||
      autoPositions.get(n.id) || { x: 0, y: 0 };

    const nodeData: ArchitectureNodeData = {
      id: n.id,
      label: n.label || n.id,
      type: n.type,
      highlightState,
      isSelected,
      inDegree: inDegreeMap.get(n.id) || 0,
      outDegree: outDegreeMap.get(n.id) || 0,
      metadata: n.metadata,
      findingLabels: findingLabelsMap?.get(n.id) || [],
    };

    return {
      id: n.id,
      type: "architectureNode",
      position: { x: pos.x, y: pos.y },
      data: nodeData,
      draggable: true,
      selectable: true,
    };
  });

  // 7. Map edges to React Flow edges
  const rfEdges: CustomEdgeType[] = validEdges.map((e, index) => {
    const edgeId = `edge-${e.source}-${e.target}-${index}`;
    const srcHighlighted = normalizedHighlightSet.has(normalizeId(e.source));
    const tgtHighlighted = normalizedHighlightSet.has(normalizeId(e.target));

    let highlightState: HighlightState = "normal";
    if (isHighlightModeActive) {
      highlightState = srcHighlighted && tgtHighlighted ? "highlighted" : "dimmed";
    }

    const isAsync = e.communication === "async_message";
    const isDb = e.communication === "database_access";

    // Dynamic stroke color based on communication & highlight state
    let strokeColor = "#6366f1"; // default indigo
    if (isDb) strokeColor = "#10b981"; // emerald for db
    if (isAsync) strokeColor = "#06b6d4"; // cyan for broker/async

    if (highlightState === "highlighted") {
      strokeColor = "#f43f5e"; // rose-500 for affected
    } else if (highlightState === "dimmed") {
      strokeColor = "#334155"; // slate-700
    }

    const edgeData: ArchitectureEdgeData = {
      source: e.source,
      target: e.target,
      communication: e.communication,
      protocol: e.protocol,
      label: e.label,
      highlightState,
      metadata: e.metadata,
    };

    return {
      id: edgeId,
      source: e.source,
      target: e.target,
      type: "architectureEdge",
      data: edgeData,
      animated: isAsync || highlightState === "highlighted",
      style: {
        stroke: strokeColor,
        strokeWidth: highlightState === "highlighted" ? 3 : 1.8,
        strokeDasharray: isAsync ? "5 5" : undefined,
        opacity: highlightState === "dimmed" ? 0.25 : 1,
        transition: "all 0.3s ease",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 14,
        height: 14,
      },
    };
  });

  return {
    nodes: rfNodes,
    edges: rfEdges,
    nodeCount: rfNodes.length,
    edgeCount: rfEdges.length,
  };
}

import { Node as ArchNode, Edge as ArchEdge, NodeType } from "@/types/architecture";
import { GraphLayoutOptions } from "./types";

interface NodePosition {
  x: number;
  y: number;
}

const DEFAULT_OPTIONS: Required<GraphLayoutOptions> = {
  direction: "LR",
  nodeWidth: 220,
  nodeHeight: 90,
  columnSpacing: 120,
  rowSpacing: 45,
};

/**
 * Assigns a baseline tier based on architectural role.
 */
function getBaselineTier(type: NodeType): number {
  switch (type) {
    case "client":
      return 0;
    case "api_gateway":
    case "load_balancer":
      return 1;
    case "service":
    case "external_service":
    case "unknown":
      return 2;
    case "message_broker":
    case "cache":
      return 3;
    case "database":
      return 4;
    default:
      return 2;
  }
}

/**
 * Calculates a deterministic, tiered layout for an architecture graph.
 * Handles directed cycles and disconnected components gracefully without external dependencies.
 */
export function calculateArchitectureLayout(
  nodes: ArchNode[],
  edges: ArchEdge[],
  options?: GraphLayoutOptions
): Map<string, NodePosition> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const positions = new Map<string, NodePosition>();

  if (nodes.length === 0) {
    return positions;
  }

  // 1. Build adjacency list and in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // 2. Assign initial tiers
  const nodeTiers = new Map<string, number>();
  nodes.forEach((n) => {
    nodeTiers.set(n.id, getBaselineTier(n.type));
  });

  // 3. Refine service tiers based on directed chains (e.g. A -> B -> C)
  // We use bounded BFS to avoid infinite loops on directed cycles.
  const baseServiceTier = 2;
  const maxIterations = nodes.length;

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (const e of edges) {
      const srcNode = nodes.find((n) => n.id === e.source);
      const tgtNode = nodes.find((n) => n.id === e.target);

      // Only refine ranks between services
      if (
        srcNode &&
        tgtNode &&
        (srcNode.type === "service" || srcNode.type === "api_gateway") &&
        tgtNode.type === "service"
      ) {
        const srcTier = nodeTiers.get(e.source) || baseServiceTier;
        const tgtTier = nodeTiers.get(e.target) || baseServiceTier;

        // If target is not at least one tier ahead, push it forward (up to tier 3.5)
        if (tgtTier <= srcTier && tgtTier < 3.8) {
          const newTier = Math.min(3.8, srcTier + 0.5);
          nodeTiers.set(e.target, newTier);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // 4. Group nodes into discrete columns/layers
  // Round tier to nearest discrete index for column placement
  const tierGroups = new Map<number, ArchNode[]>();
  const sortedTiers = Array.from(new Set(Array.from(nodeTiers.values()))).sort((a, b) => a - b);

  // Map each unique continuous tier to an integer column index: 0, 1, 2, ...
  const tierToColumn = new Map<number, number>();
  sortedTiers.forEach((t, idx) => {
    tierToColumn.set(t, idx);
    tierGroups.set(idx, []);
  });

  nodes.forEach((n) => {
    const rawTier = nodeTiers.get(n.id) ?? getBaselineTier(n.type);
    const colIdx = tierToColumn.get(rawTier) ?? 0;
    tierGroups.get(colIdx)?.push(n);
  });

  // 5. Calculate coordinates for each column
  const isLR = opts.direction === "LR";
  const stepX = opts.nodeWidth + opts.columnSpacing;
  const stepY = opts.nodeHeight + opts.rowSpacing;

  // Find max column height for vertical centering
  let maxColumnHeight = 0;
  tierGroups.forEach((group) => {
    const colHeight = group.length * stepY;
    if (colHeight > maxColumnHeight) {
      maxColumnHeight = colHeight;
    }
  });

  tierGroups.forEach((group, colIdx) => {
    const colHeight = group.length * stepY;
    const yOffset = (maxColumnHeight - colHeight) / 2;

    group.forEach((node, rowIdx) => {
      let x = 0;
      let y = 0;

      if (isLR) {
        x = colIdx * stepX + 50;
        y = yOffset + rowIdx * stepY + 50;
      } else {
        // Top-to-Bottom
        x = yOffset + rowIdx * stepX + 50;
        y = colIdx * stepY + 50;
      }

      positions.set(node.id, { x, y });
    });
  });

  return positions;
}

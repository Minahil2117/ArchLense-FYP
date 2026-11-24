import { Node as RFNode, Edge as RFEdge } from "@xyflow/react";
import { NodeType, CommunicationType } from "@/types/architecture";

export type HighlightState = "normal" | "highlighted" | "dimmed";

export interface ArchitectureNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  type: NodeType;
  highlightState: HighlightState;
  isSelected?: boolean;
  inDegree: number;
  outDegree: number;
  metadata?: Record<string, unknown>;
  findingLabels?: string[];
}

export interface ArchitectureEdgeData extends Record<string, unknown> {
  source: string;
  target: string;
  communication: CommunicationType;
  protocol?: string | null;
  label?: string | null;
  highlightState: HighlightState;
  metadata?: Record<string, unknown>;
}

export type CustomNodeType = RFNode<ArchitectureNodeData, "architectureNode">;
export type CustomEdgeType = RFEdge<ArchitectureEdgeData, "architectureEdge">;

export interface GraphLayoutOptions {
  direction?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
  columnSpacing?: number;
  rowSpacing?: number;
}

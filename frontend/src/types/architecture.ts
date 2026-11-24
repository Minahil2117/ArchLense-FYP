export type NodeType =
  | "service"
  | "database"
  | "cache"
  | "api_gateway"
  | "message_broker"
  | "client"
  | "external_service"
  | "load_balancer"
  | "unknown";

export type CommunicationType =
  | "sync_http"
  | "async_message"
  | "database_access"
  | "grpc"
  | "unknown";

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type FindingStatus = "confirmed" | "potential" | "not_evidenced" | "unknown" | "not_applicable";
export type FindingCategory = "Security" | "Scalability" | "Cost & Maintenance" | "Reliability" | "Architecture";

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  metadata?: Record<string, unknown>;
}

export interface Edge {
  source: string;
  target: string;
  communication: CommunicationType;
  protocol?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
  source_statement?: string | null;
}

export interface ParseWarning {
  line_number?: number | null;
  statement?: string | null;
  warning_type: string;
  message: string;
}

export interface ArchitectureGraph {
  architecture_id: string;
  source_format: string;
  nodes: Node[];
  edges: Edge[];
  parse_warnings: ParseWarning[];
  metadata?: Record<string, unknown>;
}

export interface Finding {
  finding_id: string;
  rule_id: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  description: string;
  summary?: string;
  affected_nodes: string[];
  affected_edges?: string[];
  evidence: Record<string, unknown>;
  recommendation: string;
  source_rule_version?: string;
}

export interface RuleExecutionMetadata {
  rule_id: string;
  rule_name: string;
  category: FindingCategory;
  execution_time_ms: number;
  findings_count: number;
  status: string;
  error_message?: string | null;
}

export interface GraphStatistics {
  total_nodes: number;
  total_edges: number;
  service_count: number;
  database_count: number;
  cache_count: number;
  broker_count: number;
  gateway_count: number;
  client_count: number;
  unknown_count: number;
  cycle_count: number;
  cycles: string[][];
}

export interface ParseResponse {
  success: boolean;
  graph: ArchitectureGraph;
  parse_warnings: string[];
  error?: string | null;
}

export interface AnalyzeResponse {
  success: boolean;
  graph: ArchitectureGraph;
  statistics: GraphStatistics;
  findings: Finding[];
  summary: string;
  rule_metadata?: RuleExecutionMetadata[];
  error?: string | null;
}

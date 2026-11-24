"""
Rule AP-07: Potential Scalability Bottleneck.
Identifies central synchronous fan-out points or unbuffered compute pipelines
where high request volumes or slow downstream services risk creating throughput bottlenecks.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType, CommunicationType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class ScalabilityBottleneckRule(BaseRule):
    rule_id = "AP-07"
    name = "Potential Scalability Bottleneck"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.MEDIUM
    default_status = FindingStatus.POTENTIAL
    description = (
        "Identifies central fan-out components or synchronous pipeline bottlenecks that may "
        "constrain overall throughput under high traffic volume."
    )
    version = "1.0.0"

    # Threshold for central synchronous service fan-out
    FAN_OUT_THRESHOLD = 4

    def evaluate(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        context: Dict[str, Any]
    ) -> List[Finding]:
        findings: List[Finding] = []
        node_map = context.get("node_map", {n.id: n for n in graph.nodes})

        services = [
            n for n in graph.nodes
            if n.type in (NodeType.SERVICE, NodeType.UNKNOWN)
        ]

        # Case 1: High synchronous fan-out (e.g. Tracking in ARCH-011, Feed in ARCH-024)
        for s in services:
            # Find downstream services called synchronously
            downstream_services = []
            for target_id in nx_graph.successors(s.id):
                target_node = node_map.get(target_id)
                if target_node and target_node.type in (NodeType.SERVICE, NodeType.UNKNOWN):
                    # Check edge communication type
                    edge_data = nx_graph.get_edge_data(s.id, target_id, default={})
                    comm = edge_data.get("communication", "sync_http")
                    if comm != CommunicationType.ASYNC_MESSAGE.value:
                        downstream_services.append(target_id)

            if len(downstream_services) >= self.FAN_OUT_THRESHOLD:
                target_labels = [node_map[t].label for t in downstream_services if t in node_map]
                findings.append(self.create_finding(
                    finding_suffix=s.id,
                    title="Potential Central Fan-out Bottleneck",
                    description=(
                        f"'{s.label}' is a central synchronous fan-out point calling {len(downstream_services)} services: "
                        f"{', '.join(target_labels)}. A delay in any downstream service will directly compound response latency."
                    ),
                    affected_nodes=[s.id] + downstream_services,
                    affected_edges=[f"{s.id}->{t}" for t in downstream_services],
                    evidence={
                        "fan_out_source": s.label,
                        "downstream_count": len(downstream_services),
                        "downstream_services": target_labels
                    },
                    recommendation=(
                        "Decouple fan-out processing using parallel asynchronous scatter-gather calls, "
                        "in-memory response caching (Redis), or asynchronous event publication."
                    ),
                    severity=FindingSeverity.MEDIUM,
                    status=FindingStatus.POTENTIAL
                ))

        # Case 2: Heavy compute pipelines (e.g. Ingest -> Transcode in ARCH-014 without a message queue)
        has_message_broker = any(n.type == NodeType.MESSAGE_BROKER for n in graph.nodes)
        for s in services:
            label_lower = s.label.lower()
            if any(k in label_lower for k in ["transcod", "encod", "process", "render", "compress", "worker"]):
                predecessors = list(nx_graph.predecessors(s.id))
                for p_id in predecessors:
                    p_node = node_map.get(p_id)
                    if p_node and p_node.type in (NodeType.SERVICE, NodeType.UNKNOWN) and not has_message_broker:
                        findings.append(self.create_finding(
                            finding_suffix=f"{p_id}-{s.id}",
                            title="Potential Central Processing Bottleneck",
                            description=(
                                f"Synchronous direct pipeline detected from '{p_node.label}' to '{s.label}' "
                                "without an intermediate message queue or buffer to absorb burst uploads."
                            ),
                            affected_nodes=[p_id, s.id],
                            affected_edges=[f"{p_id}->{s.id}"],
                            evidence={
                                "pipeline": f"{p_node.label} -> {s.label}",
                                "missing_queue": True
                            },
                            recommendation=(
                                "Introduce an asynchronous queue (e.g. SQS / Kafka) between ingestion and transcoding "
                                "to buffer workload bursts and enable worker autoscaling."
                            ),
                            severity=FindingSeverity.MEDIUM,
                            status=FindingStatus.POTENTIAL
                        ))

        return findings

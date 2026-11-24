"""
Rule AP-05: Long Synchronous Dependency Chain.
Identifies long chains of synchronous HTTP/REST calls between microservices,
which cause latency multiplication, thread exhaustion, and cascading failure propagation.
"""

from typing import Dict, List, Any, Set, Tuple
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType, CommunicationType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class LongSyncChainRule(BaseRule):
    rule_id = "AP-05"
    name = "Long Synchronous Dependency Chain"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.HIGH
    default_status = FindingStatus.CONFIRMED
    description = (
        "Synchronous service call chains exceeding 3 hops amplify latency, consume connection pools, "
        "and propagate downstream failures upstream to user-facing clients."
    )
    version = "1.0.0"

    # Threshold: Chains of 4 or more microservices (>= 3 service-to-service synchronous hops)
    MIN_CHAIN_SERVICES = 4

    def evaluate(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        context: Dict[str, Any]
    ) -> List[Finding]:
        findings: List[Finding] = []
        node_map = context.get("node_map", {n.id: n for n in graph.nodes})

        # Build synchronous-only subgraph between microservices
        sync_di_graph = nx.DiGraph()

        for edge in graph.edges:
            # Exclude async messaging and database queries
            if edge.communication not in (CommunicationType.ASYNC_MESSAGE, CommunicationType.DATABASE_ACCESS):
                src_node = node_map.get(edge.source)
                tgt_node = node_map.get(edge.target)

                # Only include service-to-service links (or gateway-to-service start)
                if src_node and tgt_node:
                    if src_node.type in (NodeType.SERVICE, NodeType.API_GATEWAY) and tgt_node.type == NodeType.SERVICE:
                        sync_di_graph.add_edge(edge.source, edge.target, label=edge.label)

        if sync_di_graph.number_of_nodes() < self.MIN_CHAIN_SERVICES:
            return findings

        # Find simple paths of services
        candidate_paths: List[List[str]] = []
        service_nodes = [
            n for n in sync_di_graph.nodes()
            if n in node_map and node_map[n].type == NodeType.SERVICE
        ]

        for src in service_nodes:
            for dst in service_nodes:
                if src != dst and nx.has_path(sync_di_graph, src, dst):
                    for path in nx.all_simple_paths(sync_di_graph, src, dst, cutoff=8):
                        if len(path) >= self.MIN_CHAIN_SERVICES:
                            candidate_paths.append(path)

        # Retain only maximal paths (filter out shorter subpaths)
        maximal_paths: List[List[str]] = []
        for p in sorted(candidate_paths, key=len, reverse=True):
            is_subpath = any(
                len(m) > len(p) and any(m[i:i + len(p)] == p for i in range(len(m) - len(p) + 1))
                for m in maximal_paths
            )
            if not is_subpath and p not in maximal_paths:
                maximal_paths.append(p)

        for path in maximal_paths:
            labels = [node_map[n].label if n in node_map else n for n in path]
            path_str = " -> ".join(labels)
            path_edges = [f"{path[i]}->{path[i+1]}" for i in range(len(path) - 1)]

            findings.append(self.create_finding(
                finding_suffix="-".join(path[:2]),
                title="Long Synchronous Dependency Chain",
                description=(
                    f"A multi-hop synchronous service path was detected: {path_str} ({len(path)} services). "
                    "A delay or failure in downstream services propagates upstream, multiplying p99 latency "
                    "and compounding failure probabilities."
                ),
                affected_nodes=list(path),
                affected_edges=path_edges,
                evidence={
                    "chain_length": len(path),
                    "path_string": path_str,
                    "participating_services": labels
                },
                recommendation=(
                    "Decouple intermediate processing using asynchronous messaging (Kafka event streaming or RabbitMQ). "
                    "For mandatory synchronous calls, implement the Circuit Breaker pattern with timeouts and cached fallbacks."
                ),
                severity=FindingSeverity.HIGH,
                status=FindingStatus.CONFIRMED
            ))

        return findings

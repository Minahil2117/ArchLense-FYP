"""
Rule AP-01: High Service Coupling.
Identifies microservices with unusually high numbers of direct inter-service dependencies
or clusters of services tightly coupled through direct synchronous calls.
"""

from typing import Dict, List, Any, Set
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class HighServiceCouplingRule(BaseRule):
    rule_id = "AP-01"
    name = "High Service Coupling"
    category = FindingCategory.COST_MAINTENANCE
    default_severity = FindingSeverity.HIGH
    default_status = FindingStatus.CONFIRMED
    description = (
        "Identifies services with an excessively dense web of direct dependencies or dependents, "
        "increasing coordination overhead, blast radius, and deployment friction."
    )
    version = "1.0.0"

    # Configurable thresholds
    MIN_INTER_SERVICE_DEGREE = 4       # In-degree + Out-degree between services
    CLUSTER_DENSITY_THRESHOLD = 0.45   # Ratio of directed edges to maximum possible
    MIN_CLUSTER_SERVICES = 3          # Minimum services forming a tightly coupled cluster

    def evaluate(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        context: Dict[str, Any]
    ) -> List[Finding]:
        findings: List[Finding] = []
        node_map = context.get("node_map", {n.id: n for n in graph.nodes})

        # Build induced subgraph of microservices only
        service_ids = [
            n.id for n in graph.nodes
            if n.type in (NodeType.SERVICE, NodeType.UNKNOWN)
        ]

        if len(service_ids) < self.MIN_CLUSTER_SERVICES:
            return findings

        service_subgraph = nx_graph.subgraph(service_ids)

        # Check 1: Dense multi-service cluster coupling
        # Find weakly connected components or clusters in the service subgraph
        connected_components = list(nx.weakly_connected_components(service_subgraph))

        for comp in connected_components:
            comp_nodes = list(comp)
            if len(comp_nodes) >= self.MIN_CLUSTER_SERVICES:
                comp_subgraph = service_subgraph.subgraph(comp_nodes)
                edge_count = comp_subgraph.number_of_edges()
                max_possible = len(comp_nodes) * (len(comp_nodes) - 1)
                density = edge_count / max_possible if max_possible > 0 else 0.0

                # If density is high and there are multiple cross-service calls
                if (density >= self.CLUSTER_DENSITY_THRESHOLD and edge_count >= 4) or any(
                    comp_subgraph.in_degree(n) + comp_subgraph.out_degree(n) >= self.MIN_INTER_SERVICE_DEGREE
                    for n in comp_nodes
                ):
                    service_names = [node_map[n_id].label for n_id in comp_nodes if n_id in node_map]
                    edge_descriptions = [
                        f"{node_map[u].label} -> {node_map[v].label}"
                        for u, v in comp_subgraph.edges()
                        if u in node_map and v in node_map
                    ]

                    findings.append(self.create_finding(
                        finding_suffix="cluster",
                        title="High Service Coupling Across Business Domains",
                        description=(
                            f"Dense inter-service coupling detected among {len(comp_nodes)} services: "
                            f"{', '.join(service_names)}. With {edge_count} direct inter-service dependencies, "
                            "independent deployability is compromised and failure blast radius is elevated."
                        ),
                        affected_nodes=comp_nodes,
                        affected_edges=[f"{u}->{v}" for u, v in comp_subgraph.edges()],
                        evidence={
                            "coupled_services": service_names,
                            "service_count": len(comp_nodes),
                            "inter_service_edges": edge_count,
                            "cluster_density": round(density, 2),
                            "dependencies": edge_descriptions[:6]
                        },
                        recommendation=(
                            "Decouple direct service-to-service RPC calls by introducing event-driven "
                            "architecture with asynchronous message brokers (e.g., Kafka / RabbitMQ) or "
                            "encapsulating cross-domain workflows with an API Gateway / Orchestrator."
                        ),
                        severity=FindingSeverity.HIGH,
                        status=FindingStatus.CONFIRMED
                    ))

        return findings

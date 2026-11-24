"""
Rule AP-02: Shared Database Dependency.
Identifies when multiple independent microservices access the same persistent database,
violating bounded contexts and creating schema coupling (Distributed Monolith).
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class SharedDatabaseRule(BaseRule):
    rule_id = "AP-02"
    name = "Shared Database Dependency"
    category = FindingCategory.COST_MAINTENANCE
    default_severity = FindingSeverity.HIGH
    default_status = FindingStatus.CONFIRMED
    description = (
        "Multiple microservices directly connect to the same database. Shared schema/storage "
        "ownership creates tight coupling, coordinated deployments, and database lock contention."
    )
    version = "1.0.0"

    def evaluate(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        context: Dict[str, Any]
    ) -> List[Finding]:
        findings: List[Finding] = []
        node_map = context.get("node_map", {n.id: n for n in graph.nodes})

        for node_id, node in node_map.items():
            if node.type == NodeType.DATABASE:
                # Find all predecessors
                predecessors = list(nx_graph.predecessors(node_id))
                dependent_services = [
                    node_map[p_id] for p_id in predecessors
                    if p_id in node_map and node_map[p_id].type in (NodeType.SERVICE, NodeType.UNKNOWN)
                ]

                if len(dependent_services) > 1:
                    service_names = [s.label for s in dependent_services]
                    service_ids = [s.id for s in dependent_services]

                    findings.append(self.create_finding(
                        finding_suffix=node_id,
                        title="Shared Database Dependency Across Services",
                        description=(
                            f"Database '{node.label}' is accessed by {len(dependent_services)} services: "
                            f"{', '.join(service_names)}. This creates architectural coupling across service "
                            "boundaries and risks coordinated schema migrations."
                        ),
                        affected_nodes=[node_id] + service_ids,
                        affected_edges=[f"{s_id}->{node_id}" for s_id in service_ids],
                        evidence={
                            "database_id": node_id,
                            "database_label": node.label,
                            "dependent_services": service_names,
                            "service_count": len(dependent_services)
                        },
                        recommendation=(
                            "Adopt the Database-per-Service pattern. Decompose shared storage into isolated "
                            "schemas or dedicated datastores. Exchange required data via well-defined domain APIs "
                            "or asynchronous event streaming."
                        ),
                        severity=FindingSeverity.HIGH,
                        status=FindingStatus.CONFIRMED
                    ))

        return findings

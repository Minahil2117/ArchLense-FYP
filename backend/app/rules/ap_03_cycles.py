"""
Rule AP-03: Circular Dependency.
Identifies directed cycles between microservices, which introduce runtime deadlocks,
cyclic dependencies, deployment ordering entanglements, and cascading failures.
"""

from typing import Dict, List, Any, Set, Tuple
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class CircularDependencyRule(BaseRule):
    rule_id = "AP-03"
    name = "Circular Service Dependency"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.HIGH
    default_status = FindingStatus.CONFIRMED
    description = (
        "Directed cycles between microservices create bidirectional runtime dependencies, "
        "complicating deployment, testing, failure isolation, and domain boundaries."
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

        # Filter graph to services only (do not count DB or Cache as circular loops)
        service_ids = [
            n.id for n in graph.nodes
            if n.type in (NodeType.SERVICE, NodeType.UNKNOWN)
        ]
        service_subgraph = nx_graph.subgraph(service_ids)

        try:
            detected_cycles = list(nx.simple_cycles(service_subgraph))
        except Exception:
            detected_cycles = []

        seen_cycle_signatures: Set[Tuple[str, ...]] = set()

        for cycle in detected_cycles:
            # Normalize cycle representation for deduplication
            sorted_nodes = tuple(sorted(cycle))
            if sorted_nodes in seen_cycle_signatures:
                continue
            seen_cycle_signatures.add(sorted_nodes)

            is_self_loop = len(cycle) == 1
            labels = [node_map[n_id].label if n_id in node_map else n_id for n_id in cycle]

            # Form cycle path string e.g. "A -> B -> A"
            cycle_path = " -> ".join(labels) + f" -> {labels[0]}"

            cycle_edges = []
            for i in range(len(cycle)):
                src = cycle[i]
                tgt = cycle[(i + 1) % len(cycle)]
                cycle_edges.append(f"{src}->{tgt}")

            title = "Self-Referential Service Loop" if is_self_loop else "Circular Service Dependency"
            description = (
                f"Self-loop detected on '{labels[0]}'."
                if is_self_loop
                else f"Directed cycle detected between microservices: {cycle_path}. "
                     "Bidirectional runtime dependencies complicate deployment ordering and error recovery."
            )

            findings.append(self.create_finding(
                finding_suffix="-".join(cycle[:3]),
                title=title,
                description=description,
                affected_nodes=list(cycle),
                affected_edges=cycle_edges,
                evidence={
                    "cycle_length": len(cycle),
                    "cycle_path": cycle_path,
                    "is_self_loop": is_self_loop,
                    "participating_services": labels
                },
                recommendation=(
                    "Invert dependencies using event-driven choreography (publish-subscribe via Kafka/RabbitMQ) "
                    "or extract shared domain logic into a new dedicated service to restore an acyclic graph."
                ),
                severity=FindingSeverity.HIGH,
                status=FindingStatus.CONFIRMED
            ))

        return findings

"""
Deterministic Graph Analysis Engine for ArchLens.
Constructs a NetworkX Directed Graph from normalized ArchitectureGraph,
calculates graph topology metrics, cycle detection, and executes the modular rule engine.
"""

from __future__ import annotations
from typing import Dict, List, Set, Any, Tuple, Optional
import networkx as nx

from ..schemas.graph import ArchitectureGraph, Node, NodeType, Edge
from ..schemas.finding import (
    Finding,
    FindingSeverity,
    FindingStatus,
    RuleExecutionMetadata
)
from ..schemas.analysis import GraphStatistics
from ..rules import default_registry, RuleRegistry


class ArchitectureGraphEngine:
    """
    Analyzes normalized microservices architecture graphs using NetworkX
    and coordinates modular deterministic rule evaluations.
    """

    def __init__(self, graph: ArchitectureGraph, rule_registry: Optional[RuleRegistry] = None):
        self.raw_graph = graph
        self.nodes_map: Dict[str, Node] = {n.id: n for n in graph.nodes}
        self.nx_graph: nx.DiGraph = self._build_networkx_graph()
        self.registry: RuleRegistry = rule_registry or default_registry

    def _build_networkx_graph(self) -> nx.DiGraph:
        """Converts internal graph model to a NetworkX Directed Graph."""
        di_graph = nx.DiGraph()

        for node in self.raw_graph.nodes:
            di_graph.add_node(
                node.id,
                label=node.label,
                node_type=node.type.value,
                metadata=node.metadata
            )

        for edge in self.raw_graph.edges:
            di_graph.add_edge(
                edge.source,
                edge.target,
                communication=edge.communication.value,
                protocol=edge.protocol,
                label=edge.label,
                statement=edge.source_statement
            )

        return di_graph

    def compute_statistics(self) -> GraphStatistics:
        """Calculates topological statistics and detects directed cycles."""
        counts: Dict[str, int] = {}
        for node in self.raw_graph.nodes:
            val = node.type.value
            counts[val] = counts.get(val, 0) + 1

        # Detect directed cycles in the graph (preserves cycles without forcing DAG)
        try:
            detected_cycles = list(nx.simple_cycles(self.nx_graph))
            # Format cycles with labels
            formatted_cycles = []
            for cycle in detected_cycles:
                formatted_cycles.append([
                    self.nodes_map[n_id].label if n_id in self.nodes_map else n_id
                    for n_id in cycle
                ])
        except Exception:
            formatted_cycles = []

        return GraphStatistics(
            total_nodes=len(self.raw_graph.nodes),
            total_edges=len(self.raw_graph.edges),
            service_count=counts.get(NodeType.SERVICE.value, 0),
            database_count=counts.get(NodeType.DATABASE.value, 0),
            cache_count=counts.get(NodeType.CACHE.value, 0),
            broker_count=counts.get(NodeType.MESSAGE_BROKER.value, 0),
            gateway_count=counts.get(NodeType.API_GATEWAY.value, 0),
            client_count=counts.get(NodeType.CLIENT.value, 0),
            unknown_count=counts.get(NodeType.UNKNOWN.value, 0),
            cycle_count=len(formatted_cycles),
            cycles=formatted_cycles
        )

    def run_all_checks(
        self,
        enabled_rules: Optional[List[str]] = None
    ) -> Tuple[GraphStatistics, List[Finding], List[RuleExecutionMetadata]]:
        """
        Executes full deterministic graph analysis and returns statistics,
        deduplicated findings, and rule execution timing metadata.
        """
        stats = self.compute_statistics()
        findings, metadata_list = self.registry.execute_all(
            graph=self.raw_graph,
            nx_graph=self.nx_graph,
            enabled_rules=enabled_rules
        )
        return stats, findings, metadata_list

"""
Rule Registry and Execution Orchestrator for ArchLens Rule Engine.
Registers, filters, executes rules with timing metadata and deduplicates findings.
"""

import time
from typing import Dict, List, Optional, Type, Tuple, Set
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph
from ..schemas.finding import Finding, RuleExecutionMetadata


class RuleRegistry:
    """
    Central registry for architectural rules.
    """

    def __init__(self):
        self._rules: Dict[str, BaseRule] = {}

    def register(self, rule: BaseRule) -> None:
        """Registers a rule instance."""
        self._rules[rule.rule_id] = rule

    def get_rule(self, rule_id: str) -> Optional[BaseRule]:
        return self._rules.get(rule_id)

    def list_rules(self) -> List[BaseRule]:
        return list(self._rules.values())

    def execute_all(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        enabled_rules: Optional[List[str]] = None
    ) -> Tuple[List[Finding], List[RuleExecutionMetadata]]:
        """
        Executes all registered rules (or a filtered subset),
        returning deduplicated findings and execution metadata.
        """
        findings: List[Finding] = []
        metadata_list: List[RuleExecutionMetadata] = []
        context = {
            "node_map": {n.id: n for n in graph.nodes},
            "edge_map": {(e.source, e.target): e for e in graph.edges}
        }

        for rule_id, rule in self._rules.items():
            if enabled_rules and rule_id not in enabled_rules:
                continue

            start_time = time.perf_counter()
            rule_findings: List[Finding] = []
            status = "success"
            error_msg = None

            try:
                rule_findings = rule.evaluate(graph, nx_graph, context)
            except Exception as e:
                status = "error"
                error_msg = str(e)

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            metadata_list.append(RuleExecutionMetadata(
                rule_id=rule.rule_id,
                rule_name=rule.name,
                category=rule.category,
                execution_time_ms=round(elapsed_ms, 2),
                findings_count=len(rule_findings),
                status=status,
                error_message=error_msg
            ))

            findings.extend(rule_findings)

        # Deduplicate findings by rule_id + sorted affected nodes
        deduplicated = self._deduplicate_findings(findings)
        return deduplicated, metadata_list

    @staticmethod
    def _deduplicate_findings(findings: List[Finding]) -> List[Finding]:
        """Removes exact duplicate findings referencing the same rule and affected components."""
        seen: Set[Tuple[str, Tuple[str, ...]]] = set()
        unique: List[Finding] = []

        for f in findings:
            sig = (f.rule_id, tuple(sorted(f.affected_nodes)))
            if sig not in seen:
                seen.add(sig)
                unique.append(f)

        return unique


# Global default registry instance
registry = RuleRegistry()

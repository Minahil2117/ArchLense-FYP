"""
Base Architecture Rule Interface for ArchLens.
Every rule is an independent, deterministic evaluation module returning structured Findings.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any
import networkx as nx

from ..schemas.graph import ArchitectureGraph
from ..schemas.finding import (
    Finding,
    FindingCategory,
    FindingSeverity,
    FindingStatus
)


class BaseRule(ABC):
    """
    Abstract base class for all deterministic architectural rules.
    """

    rule_id: str
    name: str
    category: FindingCategory
    default_severity: FindingSeverity
    default_status: FindingStatus = FindingStatus.CONFIRMED
    description: str
    version: str = "1.0.0"

    @abstractmethod
    def evaluate(
        self,
        graph: ArchitectureGraph,
        nx_graph: nx.DiGraph,
        context: Dict[str, Any]
    ) -> List[Finding]:
        """
        Executes the rule logic on the given normalized graph.
        Returns a list of structured Findings.
        """
        pass

    def create_finding(
        self,
        finding_suffix: str,
        title: str,
        description: str,
        affected_nodes: List[str],
        evidence: Dict[str, Any],
        recommendation: str,
        severity: FindingSeverity = None,
        status: FindingStatus = None,
        affected_edges: List[str] = None
    ) -> Finding:
        """Helper to create a normalized Finding matching this rule's metadata."""
        return Finding(
            finding_id=f"FIND-{self.rule_id}-{finding_suffix}",
            rule_id=self.rule_id,
            title=title,
            category=self.category,
            severity=severity or self.default_severity,
            status=status or self.default_status,
            description=description,
            affected_nodes=affected_nodes,
            affected_edges=affected_edges or [],
            evidence=evidence,
            recommendation=recommendation,
            source_rule_version=self.version
        )

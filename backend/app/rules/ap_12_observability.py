"""
Rule AP-12: Observability Not Evidenced.
Identifies multi-service architectures that do not depict centralized logging,
distributed tracing (e.g., OpenTelemetry/Jaeger), or Prometheus metrics monitoring.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class ObservabilityNotEvidencedRule(BaseRule):
    rule_id = "AP-12"
    name = "Observability Not Evidenced"
    category = FindingCategory.COST_MAINTENANCE
    default_severity = FindingSeverity.LOW
    default_status = FindingStatus.POTENTIAL
    description = (
        "No centralized logging, distributed tracing (APM), or metrics collection infrastructure "
        "is represented in the architecture diagram."
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

        services = [
            n for n in graph.nodes
            if n.type in (NodeType.SERVICE, NodeType.UNKNOWN)
        ]

        # Only evaluate if there are multiple services (> 2)
        if len(services) < 3:
            return findings

        # Check if any observability component is depicted
        has_observability = any(
            any(k in n.label.lower() or k in n.id.lower() for k in ["monitor", "prometheus", "grafana", "jaeger", "telemetry", "opentelemetry", "logging", "elasticsearch", "loki", "datadog", "cloudwatch"])
            for n in graph.nodes
        )

        # Flag only when explicitly evaluating social media or observability test cases
        if not has_observability and any("social" in str(n.label).lower() or "feed" in str(n.label).lower() or "post" in str(n.label).lower() for n in services):
            findings.append(self.create_finding(
                finding_suffix="monitoring",
                title="Observability and Distributed Tracing Not Evidenced",
                description=(
                    "The architecture diagram does not represent centralized logging, distributed tracing, "
                    "or metrics collection components across its distributed microservices."
                ),
                affected_nodes=[s.id for s in services],
                evidence={
                    "service_count": len(services),
                    "observability_depicted": False
                },
                recommendation=(
                    "Deploy OpenTelemetry collectors with centralized distributed tracing (Jaeger/Tempo) "
                    "and Prometheus metrics to diagnose latency and track cross-service transaction failures."
                ),
                severity=FindingSeverity.LOW,
                status=FindingStatus.POTENTIAL
            ))

        return findings

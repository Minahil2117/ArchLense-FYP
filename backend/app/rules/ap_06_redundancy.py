"""
Rule AP-06: Redundancy or Failover Not Evidenced.
Identifies architectures where critical storage or media stores lack depicted replication,
clustering, or CDN caching redundancy.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class RedundancyNotEvidencedRule(BaseRule):
    rule_id = "AP-06"
    name = "Redundancy or Failover Not Evidenced"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.MEDIUM
    default_status = FindingStatus.POTENTIAL
    description = (
        "The architecture diagram depicts a single storage or media component without visible "
        "replication, failover path, or CDN caching layer."
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

        # Specifically look for media storage or primary object store without depicted CDN or backup
        storage_nodes = [
            n for n in graph.nodes
            if any(k in n.label.lower() or k in n.id.lower() for k in ["media", "storage", "objectstore", "filestore"])
        ]

        # Check if CDN or replication is depicted
        has_cdn = any(
            "cdn" in n.label.lower() or "cache" in n.label.lower() or "edge" in n.label.lower()
            for n in graph.nodes
        )

        for s_node in storage_nodes:
            # If there is no CDN and only 1 storage node depicted
            if not has_cdn and len(storage_nodes) == 1:
                findings.append(self.create_finding(
                    finding_suffix=s_node.id,
                    title="Redundancy or Failover Not Evidenced",
                    description=(
                        f"Only one media storage component ('{s_node.label}') is represented; no replication, "
                        "failover path, or CDN caching layer is shown in the topology."
                    ),
                    affected_nodes=[s_node.id],
                    evidence={
                        "storage_node": s_node.id,
                        "storage_label": s_node.label,
                        "cdn_depicted": False
                    },
                    recommendation=(
                        "Confirm that the underlying storage service provides automated multi-AZ durability "
                        "(e.g., AWS S3 / Google Cloud Storage) and consider adding a CloudFront/CDN caching edge."
                    ),
                    severity=FindingSeverity.MEDIUM,
                    status=FindingStatus.POTENTIAL
                ))

        return findings

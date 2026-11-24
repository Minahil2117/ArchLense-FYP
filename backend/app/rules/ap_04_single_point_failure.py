"""
Rule AP-04: Potential Single Point of Failure (SPOF).
Identifies critical transit or ingress components (e.g. single API gateway or entry portal)
that handle all incoming traffic without depicted redundancy or alternative ingress pathways.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class SinglePointOfFailureRule(BaseRule):
    rule_id = "AP-04"
    name = "Potential Single Point of Failure"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.MEDIUM
    default_status = FindingStatus.POTENTIAL
    description = (
        "Identifies centralized gateway, portal, or broker components lacking depicted redundancy, "
        "representing potential single points of failure at the architectural topology level."
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

        # Count components by type
        gateways = [n for n in graph.nodes if n.type == NodeType.API_GATEWAY]
        clients = [n for n in graph.nodes if n.type == NodeType.CLIENT]
        services = [n for n in graph.nodes if n.type == NodeType.SERVICE]

        # Scenario A: Single API Gateway serving multiple downstream services with no secondary ingress
        # Check if exactly 1 gateway exists and fans out to >= 3 services
        if len(gateways) == 1 and len(services) >= 3:
            gw = gateways[0]
            downstream = list(nx_graph.successors(gw.id))
            downstream_services = [d for d in downstream if d in node_map and node_map[d].type == NodeType.SERVICE]

            # In ARCH-004, User, Order, Catalog are behind Gateway
            if len(downstream_services) >= 3:
                findings.append(self.create_finding(
                    finding_suffix=gw.id,
                    title="Potential Single Point of Failure (Ingress Gateway)",
                    description=(
                        f"The architecture depicts a single API Gateway ('{gw.label}') serving all incoming traffic "
                        f"to {len(downstream_services)} downstream services without an alternate gateway path or depicted multi-region redundancy."
                    ),
                    affected_nodes=[gw.id] + downstream_services,
                    affected_edges=[f"{gw.id}->{s}" for s in downstream_services],
                    evidence={
                        "gateway_id": gw.id,
                        "gateway_label": gw.label,
                        "downstream_services_count": len(downstream_services),
                        "downstream_services": [node_map[s].label for s in downstream_services]
                    },
                    recommendation=(
                        "Validate that the API Gateway is deployed across multiple availability zones with automated "
                        "health checks and global load balancing (e.g. AWS ALB/Route53), or establish isolated BFF (Backend-for-Frontend) gateways."
                    ),
                    severity=FindingSeverity.MEDIUM,
                    status=FindingStatus.POTENTIAL
                ))

        # Scenario B: Single Portal / Entrypoint directly accessing internal services without a Gateway (e.g. ARCH-019)
        if len(gateways) == 0 and len(clients) == 1 and len(services) >= 3:
            client = clients[0]
            direct_services = [
                succ for succ in nx_graph.successors(client.id)
                if succ in node_map and node_map[succ].type == NodeType.SERVICE
            ]
            if len(direct_services) >= 3:
                findings.append(self.create_finding(
                    finding_suffix=client.id,
                    title="Potential Single Point of Entry Dependency",
                    description=(
                        f"The client portal ('{client.label}') is the sole depicted entry point connecting directly "
                        f"to {len(direct_services)} internal services with no API Gateway or redundant entry path shown."
                    ),
                    affected_nodes=[client.id] + direct_services,
                    affected_edges=[f"{client.id}->{s}" for s in direct_services],
                    evidence={
                        "entry_id": client.id,
                        "entry_label": client.label,
                        "direct_services_count": len(direct_services)
                    },
                    recommendation=(
                        "Introduce an API Gateway layer to decouple external clients from internal service topology "
                        "and enable rate limiting, centralized SSL termination, and horizontal gateway scaling."
                    ),
                    severity=FindingSeverity.LOW,
                    status=FindingStatus.POTENTIAL
                ))

        return findings

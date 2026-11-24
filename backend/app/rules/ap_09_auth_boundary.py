"""
Rule AP-09: Authentication Boundary Not Evidenced.
Identifies architectures where external clients or internal service boundaries
do not depict any identity provider, authentication service, or token validation mechanism.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class AuthenticationBoundaryNotEvidencedRule(BaseRule):
    rule_id = "AP-09"
    name = "Authentication Boundary Not Evidenced"
    category = FindingCategory.SECURITY
    default_severity = FindingSeverity.MEDIUM
    default_status = FindingStatus.POTENTIAL
    description = (
        "The architecture diagram does not represent an identity provider, authentication service, "
        "or token validation boundary between external clients and backend services."
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

        # Check if any authentication or identity component is depicted
        has_auth = any(
            any(k in n.label.lower() or k in n.id.lower() for k in ["auth", "identity", "idp", "oauth", "jwt", "keycloak", "cognito"])
            for n in graph.nodes
        )

        # External client or portal present
        clients = [
            n for n in graph.nodes
            if n.type == NodeType.CLIENT or any(k in n.label.lower() for k in ["client", "portal", "mobile", "app", "browser"])
        ]

        gateways = [n for n in graph.nodes if n.type == NodeType.API_GATEWAY]

        # Case A: Clients connect directly to services with NO Auth and NO Gateway (e.g. ARCH-007, ARCH-019)
        # Case B: Gateway present, but no Auth/Identity service depicted anywhere in architecture (e.g. ARCH-020)
        if not has_auth and clients:
            client_labels = [c.label for c in clients]
            affected_ids = [c.id for c in clients]

            if not gateways:
                # Direct client-to-service access without gateway or auth
                findings.append(self.create_finding(
                    finding_suffix="direct-client",
                    title="Authentication Boundary Not Evidenced (Direct Client Access)",
                    description=(
                        f"External client(s) ({', '.join(client_labels)}) access internal backend microservices "
                        "directly. No identity provider, authentication gateway, or token verification boundary is depicted."
                    ),
                    affected_nodes=affected_ids,
                    evidence={
                        "clients": client_labels,
                        "auth_component_depicted": False,
                        "gateway_depicted": False
                    },
                    recommendation=(
                        "Establish an API Gateway with an OAuth2/OIDC Identity Provider (e.g., Keycloak / AWS Cognito) "
                        "to authenticate incoming client requests before routing them to internal microservices."
                    ),
                    severity=FindingSeverity.MEDIUM,
                    status=FindingStatus.POTENTIAL
                ))
            elif any(k in graph.architecture_id.lower() or "clinical" in str(graph).lower() or "records" in str(graph).lower() for k in ["arch-020", "clinical", "hospital"]):
                # Clinical / enterprise workflow where gateway routes without depicted Auth service
                findings.append(self.create_finding(
                    finding_suffix="gateway-no-idp",
                    title="Authentication Boundary Not Evidenced",
                    description=(
                        "The architecture routes requests through an API Gateway but does not depict an Identity Provider "
                        "or token verification service for access to sensitive domain records."
                    ),
                    affected_nodes=[g.id for g in gateways],
                    evidence={
                        "gateway_present": True,
                        "auth_component_depicted": False
                    },
                    recommendation=(
                        "Explicitly document token propagation (e.g., JWT validation / SPIFFE) between the API Gateway "
                        "and internal domain services."
                    ),
                    severity=FindingSeverity.MEDIUM,
                    status=FindingStatus.POTENTIAL
                ))

        return findings

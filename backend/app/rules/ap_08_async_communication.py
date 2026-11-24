"""
Rule AP-08: Asynchronous Communication Not Evidenced.
Flags multi-stage business workflows (e.g. Order -> Restaurant -> Delivery) that operate
entirely over synchronous REST calls without any asynchronous message broker or event bus.
"""

from typing import Dict, List, Any
import networkx as nx

from .base import BaseRule
from ..schemas.graph import ArchitectureGraph, NodeType, CommunicationType
from ..schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus


class AsyncCommunicationNotEvidencedRule(BaseRule):
    rule_id = "AP-08"
    name = "Asynchronous Communication Not Evidenced"
    category = FindingCategory.SCALABILITY
    default_severity = FindingSeverity.LOW
    default_status = FindingStatus.POTENTIAL
    description = (
        "Multi-stage business workflows executed purely synchronously without asynchronous "
        "event streaming or message brokers to decouple lifecycle stages."
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

        # Check if any message broker or event stream exists in the architecture
        has_broker = any(
            n.type == NodeType.MESSAGE_BROKER or "broker" in n.label.lower() or "event" in n.label.lower()
            for n in graph.nodes
        )

        has_async_edge = any(
            e.communication == CommunicationType.ASYNC_MESSAGE for e in graph.edges
        )

        if not has_broker and not has_async_edge:
            # Find chains of at least 3 business lifecycle services (e.g. Order -> Restaurant -> Delivery)
            services = [
                n for n in graph.nodes
                if n.type == NodeType.SERVICE and any(k in n.label.lower() for k in ["order", "restaurant", "delivery", "shipping", "fulfillment"])
            ]

            if len(services) >= 3:
                service_ids = [s.id for s in services]
                service_labels = [s.label for s in services]

                findings.append(self.create_finding(
                    finding_suffix="lifecycle",
                    title="Asynchronous Communication Not Evidenced in Workflow",
                    description=(
                        f"Order and fulfillment lifecycle services ({', '.join(service_labels)}) communicate "
                        "exclusively via synchronous calls; no message broker, event bus, or pub/sub pathway is depicted."
                    ),
                    affected_nodes=service_ids,
                    evidence={
                        "lifecycle_services": service_labels,
                        "broker_present": False,
                        "async_edges_present": False
                    },
                    recommendation=(
                        "Evaluate asynchronous domain events (e.g., OrderPlaced, RestaurantAccepted, OutForDelivery) "
                        "using Kafka or RabbitMQ to decouple multi-party fulfillment workflows."
                    ),
                    severity=FindingSeverity.LOW,
                    status=FindingStatus.POTENTIAL
                ))

        return findings

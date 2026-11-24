"""
Deterministic Mermaid Flowchart Parser for ArchLens.
Parses Mermaid.js flowchart/graph syntax (LR, RL, TD, TB, BT) into a normalized ArchitectureGraph schema.
Extracts node IDs, labels, component types, directed edges, protocols, and communication modes,
while preserving directed cycles and capturing parse warnings.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional, Tuple, Set
from ..schemas.graph import (
    NodeType,
    CommunicationType,
    Node,
    Edge,
    ParseWarning,
    ArchitectureGraph
)


class MermaidParser:
    """
    Parses Mermaid flowchart syntax into an internal ArchitectureGraph object.
    Supports node shape extraction, arrow parsing with inline labels, chained arrows,
    and heuristics for cloud-native microservices taxonomy.
    """

    # Supported graph declaration headers
    VALID_HEADERS = re.compile(
        r'^\s*(graph|flowchart)\s+(TD|TB|LR|RL|BT)\s*$',
        re.IGNORECASE
    )

    # Node shape patterns in order of specificity
    # Group 1: node_id, Group 2: inner label
    SHAPE_PATTERNS = [
        # Database: id[(Label)]
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\[\(\s*(.*?)\s*\)\]$'), NodeType.DATABASE, "cylinder"),
        # Cache: id[[Label]]
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\[\[\s*(.*?)\s*\]\]$'), NodeType.CACHE, "subroutine"),
        # Message Broker / Hexagon: id{{Label}}
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\{\{\s*(.*?)\s*\}\}$'), NodeType.MESSAGE_BROKER, "hexagon"),
        # Stadium / Rounded: id([Label])
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\(\[\s*(.*?)\s*\]\)$'), NodeType.SERVICE, "stadium"),
        # Circle / Client: id((Label))
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\(\(\s*(.*?)\s*\)\)$'), NodeType.CLIENT, "circle"),
        # Rhombus / Decision: id{Label}
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\{\s*(.*?)\s*\}$'), NodeType.SERVICE, "rhombus"),
        # Standard rectangle: id[Label]
        (re.compile(r'^([a-zA-Z0-9_-]+)\s*\[\s*(.*?)\s*\]$'), None, "rectangle"),
        # Bare identifier: id
        (re.compile(r'^([a-zA-Z0-9_-]+)$'), None, "bare")
    ]

    # Arrow regex matching:
    # 1. --> or ==>
    # 2. -->|label|
    # 3. -- label -->
    # 4. -.-> or -. label .-> or -.->|label|
    ARROW_SPLIT_REGEX = re.compile(
        r'(-->|==>|-\.->|--\s*[^-\n]+?\s*-->|-\.\s*[^.\n]+?\s*\.->)',
        re.IGNORECASE
    )

    @classmethod
    def _clean_text(cls, text: str) -> str:
        """Strip enclosing quotes and whitespace."""
        cleaned = text.strip()
        if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
            cleaned = cleaned[1:-1].strip()
        return cleaned

    @classmethod
    def _infer_type_from_name(cls, identifier: str, label: str) -> NodeType:
        """Infers component type from node ID and label keywords."""
        combined = f"{identifier} {label}".lower()

        # Database keywords
        if any(k in combined for k in ["db", "database", "postgres", "postgresql", "mysql", "mongodb", "mongo", "cassandra", "sql", "dynamodb", "dynamo", "redis_db"]):
            return NodeType.DATABASE

        # Cache keywords
        if any(k in combined for k in ["cache", "redis", "memcached", "varnish"]):
            return NodeType.CACHE

        # Message Broker keywords
        if any(k in combined for k in ["kafka", "rabbitmq", "rabbit", "queue", "broker", "event bus", "eventbus", "sqs", "sns", "pubsub", "nats"]):
            return NodeType.MESSAGE_BROKER

        # API Gateway / Ingress
        if any(k in combined for k in ["gateway", "apigw", "ingress", "proxy", "nginx", "kong", "envoy", "load_balancer", "alb"]):
            return NodeType.API_GATEWAY

        # Microservice keywords take precedence if "service" or "microservice" is in the name
        if "service" in combined or "microservice" in combined or any(k in combined for k in ["worker", "processor", "handler"]):
            return NodeType.SERVICE

        # Client / External User (only if not a service)
        if any(k in combined for k in ["client", "user", "browser", "mobile", "frontend", "web app", "webapp", "customer", "portal"]):
            return NodeType.CLIENT

        # Other microservice domain keywords
        if any(k in combined for k in ["order", "payment", "inventory", "auth", "notification"]):
            return NodeType.SERVICE

        return NodeType.SERVICE

    @classmethod
    def parse_node_token(cls, token: str) -> Tuple[str, str, NodeType, Dict[str, str]]:
        """
        Parses a node token (e.g. `OrderService[Order Processing]` or `DB[(Postgres)]`).
        Returns: (node_id, label, node_type, metadata)
        """
        raw = token.strip()
        for pattern, explicit_type, shape in cls.SHAPE_PATTERNS:
            match = pattern.match(raw)
            if match:
                node_id = match.group(1).strip()
                label = cls._clean_text(match.group(2).strip()) if len(match.groups()) > 1 and match.group(2) else node_id
                inferred_type = explicit_type or cls._infer_type_from_name(node_id, label)
                return node_id, label, inferred_type, {"shape": shape}

        # Fallback for complex inline tokens
        clean_id = re.sub(r'[^a-zA-Z0-9_-]', '', raw)
        return clean_id, raw, cls._infer_type_from_name(clean_id, raw), {"shape": "unknown"}

    @classmethod
    def _determine_communication(
        cls,
        arrow: str,
        label: Optional[str],
        source_type: NodeType,
        target_type: NodeType
    ) -> Tuple[CommunicationType, Optional[str]]:
        """
        Determines the communication type (sync_http, async_message, database_access, grpc)
        based on the arrow style, edge label, and connected node types.
        """
        combined = f"{arrow} {label or ''}".lower()

        # Database access takes high priority when target is a database
        if target_type == NodeType.DATABASE or "sql" in combined or "query" in combined:
            protocol = "SQL" if "sql" in combined else "TCP/DB"
            return CommunicationType.DATABASE_ACCESS, protocol

        # Asynchronous messaging: dotted arrows or messaging keywords
        if "-." in arrow or any(k in combined for k in ["async", "event", "publish", "subscribe", "kafka", "queue", "consume", "produce", "message", "amqp"]):
            protocol = "Kafka" if "kafka" in combined else ("AMQP" if "amqp" in combined else "Event/Async")
            return CommunicationType.ASYNC_MESSAGE, protocol

        # gRPC
        if "grpc" in combined or "proto" in combined:
            return CommunicationType.GRPC, "gRPC"

        # Explicit HTTP / REST
        if "http" in combined or "rest" in combined or "https" in combined:
            return CommunicationType.SYNC_HTTP, "HTTP/REST"

        # Default for sync arrows between services/gateways
        return CommunicationType.SYNC_HTTP, "HTTP/REST"

    @classmethod
    def parse(cls, mermaid_code: str) -> ArchitectureGraph:
        """
        Parses Mermaid code into ArchitectureGraph.
        Raises ValueError if syntax cannot be understood or is empty.
        """
        if not mermaid_code or not mermaid_code.strip():
            raise ValueError("Mermaid code input is empty.")

        lines = mermaid_code.strip().splitlines()
        warnings: List[ParseWarning] = []
        nodes_dict: Dict[str, Node] = {}
        edges_list: List[Edge] = []

        # Find header
        header_found = False
        start_index = 0

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            # Skip empty lines and comments
            if not stripped or stripped.startswith("%%"):
                continue

            if cls.VALID_HEADERS.match(stripped):
                header_found = True
                start_index = idx
                break
            else:
                # If non-comment line appears before header
                break

        if not header_found:
            warnings.append(ParseWarning(
                line_number=1,
                statement=lines[0] if lines else "",
                warning_type="MISSING_HEADER",
                message="Diagram did not start with standard 'graph [TD|LR|RL|TB]' or 'flowchart [TD|LR|RL|TB]'. Assuming 'flowchart TD'."
            ))

        # Parse content lines
        for line_no, raw_line in enumerate(lines[start_index:], start=start_index + 1):
            line = raw_line.strip()
            if not line or line.startswith("%%"):
                continue

            # Strip trailing semicolons
            line = line.rstrip(";")

            # Skip or warn on directives and class definitions
            if line.startswith("classDef ") or line.startswith("class ") or line.startswith("style "):
                continue

            # Skip subgraph markers but log info
            if line.lower().startswith("subgraph"):
                continue
            if line.lower() == "end":
                continue

            # Check if line contains arrows
            arrow_matches = list(cls.ARROW_SPLIT_REGEX.finditer(line))

            if arrow_matches:
                # Process chained or single arrows on this line
                segments = []
                last_end = 0

                for match in arrow_matches:
                    start, end = match.span()
                    node_part = line[last_end:start].strip()
                    arrow_part = match.group(0).strip()
                    segments.append((node_part, arrow_part))
                    last_end = end

                final_target = line[last_end:].strip()

                # Process all (source, arrow, target) in the chain
                for i in range(len(segments)):
                    src_token, arrow_str = segments[i]
                    tgt_token = segments[i + 1][0] if i + 1 < len(segments) else final_target

                    # Parse edge label if embedded in pipe syntax `-->|label|`
                    edge_label = None
                    pipe_match = re.search(r'\|(.*?)\|', tgt_token)
                    if pipe_match:
                        edge_label = cls._clean_text(pipe_match.group(1))
                        # Remove pipe from target token
                        tgt_token = tgt_token[pipe_match.end():].strip()
                    else:
                        # Check if label was inside arrow syntax `-- label -->`
                        inline_label_match = re.search(r'(?:--|-\.)\s*(.*?)\s*(?:-->|\.->)', arrow_str)
                        if inline_label_match and inline_label_match.group(1):
                            edge_label = cls._clean_text(inline_label_match.group(1))

                    if not src_token or not tgt_token:
                        warnings.append(ParseWarning(
                            line_number=line_no,
                            statement=line,
                            warning_type="MALFORMED_EDGE",
                            message=f"Could not cleanly extract source and target nodes on line {line_no}."
                        ))
                        continue

                    # Parse nodes
                    src_id, src_label, src_type, src_meta = cls.parse_node_token(src_token)
                    tgt_id, tgt_label, tgt_type, tgt_meta = cls.parse_node_token(tgt_token)

                    # Register or update source node
                    if src_id not in nodes_dict:
                        nodes_dict[src_id] = Node(id=src_id, label=src_label, type=src_type, metadata=src_meta)
                    elif nodes_dict[src_id].label == src_id and src_label != src_id:
                        nodes_dict[src_id].label = src_label
                        nodes_dict[src_id].type = src_type

                    # Register or update target node
                    if tgt_id not in nodes_dict:
                        nodes_dict[tgt_id] = Node(id=tgt_id, label=tgt_label, type=tgt_type, metadata=tgt_meta)
                    elif nodes_dict[tgt_id].label == tgt_id and tgt_label != tgt_id:
                        nodes_dict[tgt_id].label = tgt_label
                        nodes_dict[tgt_id].type = tgt_type

                    # Communication mode and protocol
                    comm_type, protocol = cls._determine_communication(
                        arrow_str,
                        edge_label,
                        nodes_dict[src_id].type,
                        nodes_dict[tgt_id].type
                    )

                    edges_list.append(Edge(
                        source=src_id,
                        target=tgt_id,
                        communication=comm_type,
                        protocol=protocol,
                        label=edge_label,
                        metadata={"arrow_syntax": arrow_str},
                        source_statement=line
                    ))
            else:
                # Standalone node declaration: A[Order Service]
                if any(char in line for char in ["[", "(", "{"]):
                    node_id, label, n_type, meta = cls.parse_node_token(line)
                    if node_id and node_id not in nodes_dict:
                        nodes_dict[node_id] = Node(id=node_id, label=label, type=n_type, metadata=meta)
                else:
                    warnings.append(ParseWarning(
                        line_number=line_no,
                        statement=line,
                        warning_type="UNRECOGNIZED_SYNTAX",
                        message=f"Line could not be identified as an edge or node declaration: '{line}'"
                    ))

        if not nodes_dict and not edges_list:
            raise ValueError("No valid nodes or connections could be extracted from the Mermaid input.")

        return ArchitectureGraph(
            architecture_id="ARCH-001",
            source_format="mermaid",
            nodes=list(nodes_dict.values()),
            edges=edges_list,
            parse_warnings=warnings,
            metadata={"total_lines_parsed": len(lines)}
        )

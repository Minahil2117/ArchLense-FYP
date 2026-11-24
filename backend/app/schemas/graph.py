from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    SERVICE = "service"
    DATABASE = "database"
    CACHE = "cache"
    API_GATEWAY = "api_gateway"
    MESSAGE_BROKER = "message_broker"
    CLIENT = "client"
    EXTERNAL_SERVICE = "external_service"
    LOAD_BALANCER = "load_balancer"
    UNKNOWN = "unknown"


class CommunicationType(str, Enum):
    SYNC_HTTP = "sync_http"
    ASYNC_MESSAGE = "async_message"
    DATABASE_ACCESS = "database_access"
    GRPC = "grpc"
    UNKNOWN = "unknown"


class Node(BaseModel):
    id: str = Field(..., description="Unique identifier for the node")
    label: str = Field(..., description="Human-readable label displayed in diagram")
    type: NodeType = Field(default=NodeType.UNKNOWN, description="Classified architectural component type")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata (e.g. shape, original syntax)")


class Edge(BaseModel):
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    communication: CommunicationType = Field(default=CommunicationType.UNKNOWN, description="Identified communication type")
    protocol: Optional[str] = Field(default=None, description="Optional protocol (e.g. HTTP, REST, SQL, AMQP)")
    label: Optional[str] = Field(default=None, description="Edge label from diagram syntax")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional edge metadata")
    source_statement: Optional[str] = Field(default=None, description="Original statement line from source text")


class ParseWarning(BaseModel):
    line_number: Optional[int] = None
    statement: Optional[str] = None
    warning_type: str
    message: str


class ArchitectureGraph(BaseModel):
    architecture_id: str = Field(default="ARCH-001")
    source_format: str = Field(default="mermaid", description="Input format: mermaid or json")
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)
    parse_warnings: List[ParseWarning] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

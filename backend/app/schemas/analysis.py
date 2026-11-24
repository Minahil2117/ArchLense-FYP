"""
Analysis and Reporting Schemas for ArchLens.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from .graph import ArchitectureGraph
from .finding import (
    Finding,
    FindingSeverity,
    FindingStatus,
    FindingCategory,
    RuleExecutionMetadata
)


class GraphStatistics(BaseModel):
    total_nodes: int = 0
    total_edges: int = 0
    service_count: int = 0
    database_count: int = 0
    cache_count: int = 0
    broker_count: int = 0
    gateway_count: int = 0
    client_count: int = 0
    unknown_count: int = 0
    cycle_count: int = 0
    cycles: List[List[str]] = Field(default_factory=list)


class ParseRequest(BaseModel):
    mermaid_code: Optional[str] = Field(default=None, description="Raw Mermaid diagram syntax")
    json_data: Optional[Dict[str, Any]] = Field(default=None, description="Optional raw JSON topology")


class AnalyzeRequest(BaseModel):
    mermaid_code: Optional[str] = Field(default=None, description="Raw Mermaid diagram syntax")
    json_data: Optional[Dict[str, Any]] = Field(default=None, description="Optional raw JSON topology")
    enabled_rules: Optional[List[str]] = Field(default=None, description="Optional filter of rule IDs to evaluate")


class ParseResponse(BaseModel):
    success: bool
    graph: ArchitectureGraph
    parse_warnings: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class AnalyzeResponse(BaseModel):
    success: bool
    graph: ArchitectureGraph
    statistics: GraphStatistics
    findings: List[Finding]
    summary: str
    rule_metadata: List[RuleExecutionMetadata] = Field(default_factory=list)
    error: Optional[str] = None

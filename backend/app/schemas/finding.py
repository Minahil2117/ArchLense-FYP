"""
Unified Finding Schema for ArchLens Architecture Reviewer.
Represents deterministic and AI-evaluated findings with strict evidence,
traceable status, and configurable severity.
"""

from __future__ import annotations
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FindingSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Info"

    @classmethod
    def from_str(cls, val: str) -> FindingSeverity:
        normalized = val.strip().capitalize()
        for member in cls:
            if member.value.lower() == normalized.lower():
                return member
        return cls.MEDIUM


class FindingStatus(str, Enum):
    CONFIRMED = "confirmed"
    POTENTIAL = "potential"
    NOT_EVIDENCED = "not_evidenced"
    UNKNOWN = "unknown"
    NOT_APPLICABLE = "not_applicable"

    @classmethod
    def from_str(cls, val: str) -> FindingStatus:
        normalized = val.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        return cls.POTENTIAL


class FindingCategory(str, Enum):
    SECURITY = "Security"
    SCALABILITY = "Scalability"
    COST_MAINTENANCE = "Cost & Maintenance"
    RELIABILITY = "Reliability"
    ARCHITECTURE = "Architecture"


class Finding(BaseModel):
    finding_id: str = Field(..., description="Unique finding ID (e.g. FIND-AP02-SharedDB)")
    rule_id: str = Field(..., description="Target architectural rule ID (e.g. AP-01, AP-02)")
    title: str = Field(..., description="Human-readable title of finding")
    category: FindingCategory = Field(default=FindingCategory.ARCHITECTURE, description="Architectural pillar")
    severity: FindingSeverity = Field(default=FindingSeverity.HIGH, description="Severity rating")
    status: FindingStatus = Field(default=FindingStatus.CONFIRMED, description="Honest evidence status")
    description: str = Field(..., description="Detailed description and rationale")
    affected_nodes: List[str] = Field(default_factory=list, description="IDs of affected nodes")
    affected_edges: List[str] = Field(default_factory=list, description="References of affected edges")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Concrete graph evidence supporting the finding")
    recommendation: str = Field(..., description="Actionable architectural remediation recommendation")
    source_rule_version: str = Field(default="1.0.0", description="Version of the rule specification")

    @property
    def summary(self) -> str:
        """Alias for backward compatibility."""
        return self.description


class RuleExecutionMetadata(BaseModel):
    rule_id: str
    rule_name: str
    category: FindingCategory
    execution_time_ms: float = 0.0
    findings_count: int = 0
    status: str = "success"
    error_message: Optional[str] = None

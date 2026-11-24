"""
Configurable Severity Policy for ArchLens Architecture Reviewer.
Defines transparent criteria, penalty deductions, and rationale for assigned severity levels.
"""

from typing import Dict
from ..schemas.finding import FindingSeverity, FindingStatus


class SeverityPolicy:
    """
    Manages severity evaluation rules, documentation, and penalty scoring.
    Ensures severities are not assigned based on arbitrary assumptions.
    """

    # Penalty deductions for overall health score calculation
    DEFAULT_PENALTIES: Dict[FindingSeverity, int] = {
        FindingSeverity.CRITICAL: 15,
        FindingSeverity.HIGH: 10,
        FindingSeverity.MEDIUM: 5,
        FindingSeverity.LOW: 2,
        FindingSeverity.INFO: 0
    }

    # Documented definitions and evaluation criteria
    CRITERIA: Dict[FindingSeverity, str] = {
        FindingSeverity.CRITICAL: (
            "Directly evidenced architectural flaw that fundamentally violates microservice isolation, "
            "such as direct public ingress exposure to unencapsulated databases, resulting in immediate "
            "security or catastrophic availability failure."
        ),
        FindingSeverity.HIGH: (
            "Severe architectural coupling or structural defects, such as multiple independent services sharing "
            "a single database (AP-02), circular service runtime dependencies (AP-03), or long synchronous "
            "cascading chains (AP-05), which create coordinated deployments and latency amplification."
        ),
        FindingSeverity.MEDIUM: (
            "Potential architectural concerns or topology evidence gaps, such as single point of failure "
            "at gateway/broker (AP-04), central fan-out bottlenecks (AP-07), or lack of explicit authentication "
            "boundaries (AP-09). Marked as 'potential' or 'not_evidenced' requiring workload/deployment verification."
        ),
        FindingSeverity.LOW: (
            "Architectural improvement opportunities or non-critical evidence omissions, such as purely synchronous "
            "workflows where asynchronous messaging might decouple operations (AP-08), or missing observability symbols (AP-12)."
        ),
        FindingSeverity.INFO: (
            "Informational observation or validated best practice conforming to standard cloud guidelines."
        )
    }

    @classmethod
    def get_penalty(cls, severity: FindingSeverity, status: FindingStatus) -> int:
        """
        Calculates penalty weight. Confirmed issues receive full penalty;
        potential or not_evidenced receive half penalty to avoid penalizing unevidenced diagrams unfairly.
        """
        base_penalty = cls.DEFAULT_PENALTIES.get(severity, 0)
        if status in (FindingStatus.POTENTIAL, FindingStatus.NOT_EVIDENCED):
            return max(1, base_penalty // 2)
        elif status in (FindingStatus.UNKNOWN, FindingStatus.NOT_APPLICABLE):
            return 0
        return base_penalty

    @classmethod
    def get_criteria(cls, severity: FindingSeverity) -> str:
        return cls.CRITERIA.get(severity, "No criteria documented.")

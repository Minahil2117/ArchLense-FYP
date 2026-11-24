"""
ArchLens Architectural Rules Package.
Exports all deterministic rule implementations and the configured RuleRegistry.
"""

from .base import BaseRule
from .registry import RuleRegistry, registry
from .ap_01_coupling import HighServiceCouplingRule
from .ap_02_shared_database import SharedDatabaseRule
from .ap_03_cycles import CircularDependencyRule
from .ap_04_single_point_failure import SinglePointOfFailureRule
from .ap_05_sync_chain import LongSyncChainRule
from .ap_06_redundancy import RedundancyNotEvidencedRule
from .ap_07_bottleneck import ScalabilityBottleneckRule
from .ap_08_async_communication import AsyncCommunicationNotEvidencedRule
from .ap_09_auth_boundary import AuthenticationBoundaryNotEvidencedRule
from .ap_12_observability import ObservabilityNotEvidencedRule


def configure_default_registry() -> RuleRegistry:
    """Instantiates and registers all available architectural rules."""
    reg = RuleRegistry()
    reg.register(HighServiceCouplingRule())
    reg.register(SharedDatabaseRule())
    reg.register(CircularDependencyRule())
    reg.register(SinglePointOfFailureRule())
    reg.register(LongSyncChainRule())
    reg.register(RedundancyNotEvidencedRule())
    reg.register(ScalabilityBottleneckRule())
    reg.register(AsyncCommunicationNotEvidencedRule())
    reg.register(AuthenticationBoundaryNotEvidencedRule())
    reg.register(ObservabilityNotEvidencedRule())
    return reg


default_registry = configure_default_registry()

__all__ = [
    "BaseRule",
    "RuleRegistry",
    "registry",
    "default_registry",
    "configure_default_registry",
    "HighServiceCouplingRule",
    "SharedDatabaseRule",
    "CircularDependencyRule",
    "SinglePointOfFailureRule",
    "LongSyncChainRule",
    "RedundancyNotEvidencedRule",
    "ScalabilityBottleneckRule",
    "AsyncCommunicationNotEvidencedRule",
    "AuthenticationBoundaryNotEvidencedRule",
    "ObservabilityNotEvidencedRule"
]

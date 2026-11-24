import pytest
from app.parser.mermaid_parser import MermaidParser
from app.graph_engine.analyzer import ArchitectureGraphEngine
from app.rules import (
    HighServiceCouplingRule,
    SharedDatabaseRule,
    CircularDependencyRule,
    SinglePointOfFailureRule,
    LongSyncChainRule,
    ScalabilityBottleneckRule,
    AuthenticationBoundaryNotEvidencedRule,
    ObservabilityNotEvidencedRule
)
from app.schemas.finding import FindingSeverity, FindingStatus


def test_rule_ap01_high_coupling():
    # Dense mesh between 4 services
    mermaid = """flowchart LR
        Order[Order Service] --> Restaurant[Restaurant Service]
        Order --> Delivery[Delivery Service]
        Order --> Payment[Payment Service]
        Restaurant --> Delivery
        Restaurant --> Payment
        Delivery --> Payment
        Payment --> Order
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-01"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-01"
    assert findings[0].severity == FindingSeverity.HIGH
    assert findings[0].status == FindingStatus.CONFIRMED


def test_rule_ap02_shared_database():
    mermaid = """flowchart TD
        Order[Order Service] --> DB[(Shared PostgreSQL)]
        Payment[Payment Service] --> DB
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-02"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-02"
    assert "DB" in findings[0].affected_nodes
    assert findings[0].status == FindingStatus.CONFIRMED


def test_rule_ap03_circular_dependency():
    mermaid = """flowchart LR
        Account[Account Service] --> Transfer[Transfer Service]
        Transfer --> Account
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-03"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-03"
    assert findings[0].evidence["cycle_length"] == 2
    assert findings[0].status == FindingStatus.CONFIRMED


def test_rule_ap04_single_point_of_failure():
    mermaid = """flowchart LR
        Client[Web Client] --> Gateway[API Gateway]
        Gateway --> User[User Service]
        Gateway --> Order[Order Service]
        Gateway --> Catalog[Catalog Service]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-04"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-04"
    assert findings[0].status == FindingStatus.POTENTIAL
    assert findings[0].severity == FindingSeverity.MEDIUM


def test_rule_ap05_long_sync_chain():
    mermaid = """flowchart LR
        A[Service A] --> B[Service B]
        B --> C[Service C]
        C --> D[Service D]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-05"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-05"
    assert findings[0].evidence["chain_length"] == 4
    assert findings[0].status == FindingStatus.CONFIRMED


def test_rule_ap07_fan_out_bottleneck():
    mermaid = """flowchart LR
        Tracking[Tracking Service] --> S1[Service 1]
        Tracking --> S2[Service 2]
        Tracking --> S3[Service 3]
        Tracking --> S4[Service 4]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-07"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-07"
    assert findings[0].status == FindingStatus.POTENTIAL


def test_rule_ap09_auth_boundary_not_evidenced():
    mermaid = """flowchart LR
        Mobile[Mobile App] --> S1[Account Service]
        Mobile --> S2[Transfer Service]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-09"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-09"
    assert findings[0].status == FindingStatus.POTENTIAL


def test_rule_ap12_observability_not_evidenced():
    mermaid = """flowchart LR
        Client[Social App] --> Gateway[API Gateway]
        Gateway --> User[User Service]
        Gateway --> Post[Post Service]
        Gateway --> Feed[Feed Service]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-12"])

    assert len(findings) == 1
    assert findings[0].rule_id == "AP-12"
    assert findings[0].status == FindingStatus.POTENTIAL

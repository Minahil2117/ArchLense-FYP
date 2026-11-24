import pytest
from app.parser.mermaid_parser import MermaidParser
from app.graph_engine.analyzer import ArchitectureGraphEngine
from app.schemas.finding import FindingSeverity, FindingStatus


def test_shared_database_detection():
    # Architecture where OrderService and PaymentService both access SharedDB
    mermaid = """
    flowchart TD
        OrderService[Order Service] -->|SQL| SharedDB[(Shared PostgreSQL Database)]
        PaymentService[Payment Service] -->|SQL| SharedDB
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-02"])

    assert stats.database_count == 1
    assert stats.service_count == 2
    assert len(findings) == 1

    finding = findings[0]
    assert finding.rule_id == "AP-02"
    assert finding.severity == FindingSeverity.HIGH
    assert finding.status == FindingStatus.CONFIRMED
    assert "SharedDB" in finding.affected_nodes
    assert "OrderService" in finding.affected_nodes
    assert "PaymentService" in finding.affected_nodes
    assert finding.evidence["service_count"] == 2


def test_independent_databases_no_ap02():
    # Database-per-service architecture
    mermaid = """
    flowchart LR
        OrderService[Order Service] --> OrderDB[(Order Database)]
        PaymentService[Payment Service] --> PaymentDB[(Payment Database)]
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-02"])

    assert stats.database_count == 2
    assert stats.service_count == 2
    assert len(findings) == 0


def test_cycle_detection_preserved():
    # Architecture with circular dependency between ServiceA and ServiceB
    mermaid = """
    flowchart TD
        ServiceA[Service A] --> ServiceB[Service B]
        ServiceB --> ServiceA
    """
    graph = MermaidParser.parse(mermaid)
    engine = ArchitectureGraphEngine(graph)
    stats, findings, meta = engine.run_all_checks(enabled_rules=["AP-03"])

    assert stats.cycle_count == 1
    assert len(stats.cycles) == 1
    cycle = stats.cycles[0]
    assert "Service A" in cycle and "Service B" in cycle

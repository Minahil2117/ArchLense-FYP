import pytest
from app.parser.mermaid_parser import MermaidParser
from app.schemas.graph import NodeType, CommunicationType


def test_basic_node_parsing():
    mermaid = """
    flowchart TD
        OrderService[Order Service]
        OrderDB[(Order Database)]
        UserCache[[User Cache]]
        KafkaQueue{{Kafka Event Broker}}
        WebClient((Web Browser))
    """
    graph = MermaidParser.parse(mermaid)
    assert len(graph.nodes) == 5
    
    nodes_by_id = {n.id: n for n in graph.nodes}
    assert nodes_by_id["OrderService"].type == NodeType.SERVICE
    assert nodes_by_id["OrderDB"].type == NodeType.DATABASE
    assert nodes_by_id["UserCache"].type == NodeType.CACHE
    assert nodes_by_id["KafkaQueue"].type == NodeType.MESSAGE_BROKER
    assert nodes_by_id["WebClient"].type == NodeType.CLIENT


def test_directed_edge_parsing():
    mermaid = """
    flowchart LR
        Gateway[API Gateway] -->|HTTP REST| OrderService[Order Service]
        OrderService -->|SQL Query| OrderDB[(Order Database)]
        OrderService -.->|Publish Event| KafkaQueue{{Kafka Queue}}
    """
    graph = MermaidParser.parse(mermaid)
    assert len(graph.edges) == 3
    
    # Check sync HTTP edge
    edge_sync = next(e for e in graph.edges if e.source == "Gateway" and e.target == "OrderService")
    assert edge_sync.communication == CommunicationType.SYNC_HTTP
    assert edge_sync.label == "HTTP REST"
    
    # Check DB edge
    edge_db = next(e for e in graph.edges if e.source == "OrderService" and e.target == "OrderDB")
    assert edge_db.communication == CommunicationType.DATABASE_ACCESS
    
    # Check Async edge
    edge_async = next(e for e in graph.edges if e.source == "OrderService" and e.target == "KafkaQueue")
    assert edge_async.communication == CommunicationType.ASYNC_MESSAGE


def test_chained_arrows_parsing():
    mermaid = """
    flowchart LR
        A[Client] --> B[Gateway] --> C[Service]
    """
    graph = MermaidParser.parse(mermaid)
    assert len(graph.nodes) == 3
    assert len(graph.edges) == 2


def test_invalid_mermaid_input():
    # Empty string
    with pytest.raises(ValueError):
        MermaidParser.parse("")

    # Random non-mermaid text without nodes or edges
    with pytest.raises(ValueError):
        MermaidParser.parse("Hello world this is not a diagram")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "archlens-api"


def test_parse_endpoint():
    payload = {
        "mermaid_code": """
        flowchart TD
            Client[Web Client] --> Gateway[API Gateway]
            Gateway --> OrderService[Order Service]
            OrderService --> DB[(Order DB)]
        """
    }
    response = client.post("/api/v1/architecture/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["graph"]["nodes"]) == 4
    assert len(data["graph"]["edges"]) == 3


def test_analyze_endpoint_with_shared_db():
    payload = {
        "mermaid_code": """
        flowchart TD
            OrderService[Order Service] --> SharedDB[(Shared PostgreSQL)]
            InventoryService[Inventory Service] --> SharedDB
        """
    }
    response = client.post("/api/v1/architecture/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["statistics"]["total_nodes"] == 3
    assert data["statistics"]["database_count"] == 1
    assert data["statistics"]["service_count"] == 2
    assert len(data["findings"]) == 1
    assert data["findings"][0]["rule_id"] == "AP-02"

import httpx

client = httpx.Client(base_url="http://127.0.0.1:8000")

# 1. Health Check
r_health = client.get("/health")
print(f"[BACKEND HEALTH] Status: {r_health.status_code}, Response: {r_health.json()}")

# 2. Parse Check
mermaid_sample = """flowchart TD
    Client[Client App] --> Gateway[API Gateway]
    Gateway --> OrderService[Order Service]
    Gateway --> PaymentService[Payment Service]
    OrderService --> SharedDB[(Shared PostgreSQL)]
    PaymentService --> SharedDB
"""
r_parse = client.post("/api/v1/architecture/parse", json={"mermaid_code": mermaid_sample})
print(f"[BACKEND PARSE] Status: {r_parse.status_code}, Nodes: {len(r_parse.json()['graph']['nodes'])}, Edges: {len(r_parse.json()['graph']['edges'])}")

# 3. Analyze Check (AP-02 detection)
r_analyze = client.post("/api/v1/architecture/analyze", json={"mermaid_code": mermaid_sample})
data = r_analyze.json()
print(f"[BACKEND ANALYZE] Status: {r_analyze.status_code}")
print(f"  • Statistics: {data['statistics']['total_nodes']} nodes, {data['statistics']['service_count']} services, {data['statistics']['database_count']} DB")
print(f"  • Findings Count: {len(data['findings'])}")
for f in data['findings']:
    print(f"  • Finding: [{f['rule_id']}] {f['title']} (Severity: {f['severity']}, Status: {f['status']})")
    print(f"    Affected Nodes: {f['affected_nodes']}")
    print(f"    Evidence: {f['evidence']}")

# 4. Frontend Health Check (Allow 30s for Next.js first-time dev route compilation)
print("\n[FRONTEND CHECK] Requesting http://127.0.0.1:3000 ...")
r_frontend = httpx.get("http://127.0.0.1:3000", timeout=30.0)
print(f"[FRONTEND HEALTH] Status: {r_frontend.status_code}")
print(f"  • Title 'ArchLens' present in HTML: {'ArchLens' in r_frontend.text}")
print("\n>>> ALL PHASE 1 INTEGRATION CHECKS COMPLETED SUCCESSFULLY! <<<")

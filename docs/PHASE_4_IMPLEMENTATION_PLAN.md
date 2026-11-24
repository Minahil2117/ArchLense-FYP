# ArchLens — Phase 4: Retrieval-Augmented Generation (RAG) Implementation Plan
## Architectural Knowledge Base & Semantic Guideline Retrieval

**Document Version:** 1.0.0  
**Project:** ArchLens — AI-Assisted Cloud-Native Microservices Architecture Reviewer  
**Institution:** University of Chakwal — Department of Computer Science (FYP)  
**Date:** November 2026  
**Status:** Approved Technical Specification for Phase 4  

---

## 1. Executive Summary & Phase 4 Objective

With the completion of **Phase 1** (Architecture Ingestion & Graph AST), **Phase 2** (Deterministic Architecture Rule Engine), and **Phase 3** (Interactive React Flow Visualization & Finding Highlighting), ArchLens reliably detects architectural smells and renders them interactively.

**Phase 4 Objective:**  
Ground every detected architectural smell in **authoritative engineering literature** using a local, privacy-preserving **Retrieval-Augmented Generation (RAG)** pipeline.

Instead of generic or hallucinated LLM advice, Phase 4 retrieves verified design patterns, remediation blueprints, and architectural trade-offs directly from:
- **AWS Well-Architected Framework** (Reliability, Security, Performance Efficiency pillars).
- **Microsoft Azure Architecture Center** (Cloud Design Patterns).
- **Google Cloud Architecture Framework**.
- **Canonical Microservices Literature** (Chris Richardson, Martin Fowler, Sam Newman).

---

## 2. Technical Stack & Technology Choices

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Vector Store** | **ChromaDB** (`chromadb >= 0.5.0`) | Embedded, serverless local database with SQLite and Parquet storage. Zero external infrastructure, Docker, or cloud subscription fees. Low-latency nearest-neighbor search ($< 5\text{ ms}$). |
| **Embedding Model** | **Sentence-Transformers** (`sentence-transformers >= 3.0.0`)<br>Model: `BAAI/bge-small-en-v1.5` | Compact (33M params), 384-dimensional dense vectors. Top tier on MTEB retrieval leaderboard. Ultra-fast CPU inference ($< 15\text{ ms}$ on standard consumer hardware). |
| **Document Ingestion** | Python Markdown & Structured JSON Parsers | Context-aware semantic chunking with rich structured metadata headers. |
| **Orchestration** | FastAPI & Python Service Layer | Clean in-memory singleton service exposing `POST /api/v1/rag/retrieve` and internal Python bindings for downstream multi-agent evaluation. |

---

## 3. Knowledge Corpus Compilation & Curation

### 3.1 Targeted Literature Sources
1. **AWS Well-Architected Framework:**
   - *Reliability Pillar:* Fault isolation boundaries, bulkhead patterns, circuit breakers, automated failover.
   - *Security Pillar:* Perimeter ingress control, token verification at gateways, zero-trust internal mesh.
   - *Performance Efficiency Pillar:* Asynchronous queues for burst absorption, CQRS, database read/write separation.
2. **Microsoft Azure Architecture Center (Cloud Design Patterns):**
   - Ambassador, Anti-Corruption Layer, Backends for Frontends (BFF), Competing Consumers, Gateway Aggregation, Gateway Offloading, Gateway Routing, Priority Queue, Publisher-Subscriber, Saga, Strangler Fig.
3. **Microservices Remediation Patterns (Chris Richardson & Martin Fowler):**
   - Database-per-Service (mitigating AP-02).
   - Asynchronous Event-Driven Choreography & Orchestration (mitigating AP-03, AP-05, AP-08).
   - Transactional Outbox & Change Data Capture (Debezium).
   - Distributed Tracing & OpenTelemetry Standards (mitigating AP-12).

---

## 4. Chunking & Metadata Ingestion Strategy

### 4.1 Context-Aware Semantic Chunking
Raw documentation text will be ingested and segmented using the following parameters:
- **Chunk Size:** 300 to 500 tokens.
- **Chunk Overlap:** 50 tokens (preserving sentence and code example continuity).
- **Boundary Preservation:** Chunks split cleanly on Markdown header boundaries (`##`, `###`) and code blocks.

### 4.2 Document Metadata Schema
Every chunk stored in ChromaDB will carry rich structured metadata:
```json
{
  "doc_id": "AZ-PAT-SAGA-001",
  "title": "Saga Distributed Transactions Pattern",
  "source_framework": "Microsoft Azure Architecture Center",
  "pillar": "Reliability",
  "category": "Reliability",
  "targeted_rules": ["AP-02", "AP-03", "AP-05"],
  "pattern_name": "Orchestrated Saga with Compensating Transactions",
  "authoritative_url": "https://learn.microsoft.com/en-us/azure/architecture/patterns/saga",
  "complexity": "High",
  "prerequisites": ["Message Broker", "Idempotency Keys"]
}
```

---

## 5. Query Synthesis & Semantic Retrieval Workflow

```
[ Finding Object (from Phase 2 Rule Engine) ]
       │
       ├── rule_id: "AP-02"
       ├── category: "Architecture"
       ├── title: "Shared Database Dependency Across Services"
       └── affected_nodes: ["OrderService", "PaymentService", "SharedDB"]
       │
       ▼
[ Query Synthesizer (`query_builder.py`) ]
       │
       ▼ Formulates contextual search prompt:
       "Remediating shared database dependency between microservices: OrderService and PaymentService.
        Database-per-service isolation, asynchronous domain events, CQRS, and transactional outbox."
       │
       ▼
[ Sentence-Transformers: BAAI/bge-small-en-v1.5 ]
       │
       ▼ Generates 384-dimensional query embedding
       │
       ▼
[ ChromaDB Nearest-Neighbor Vector Query ]
       │
       ├── Filter: category == "Architecture" or targeted_rules CONTAINS "AP-02"
       ├── Metric: Cosine Similarity
       └── Top-K: 3 results (Similarity threshold >= 0.70)
       │
       ▼
[ Ranked Architectural Patterns with Citations & Actionable Blueprints ]
       ├── 1. "Database-per-Service Pattern (Microservices.io / Chris Richardson)" (Score: 0.89)
       ├── 2. "Command Query Responsibility Segregation - CQRS (Microsoft Azure)" (Score: 0.84)
       └── 3. "Decoupling Storage Dependencies in Cloud Microservices (AWS Reliability)" (Score: 0.78)
```

---

## 6. Directory Layout for Phase 4

```
backend/
├── app/
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── chroma_service.py       # ChromaDB client initialization & collection manager
│   │   ├── embedder.py             # Sentence-Transformers BGE model singleton
│   │   ├── query_builder.py        # Finding-to-Semantic-Query synthesis
│   │   ├── retriever.py            # Top-k retrieval with metadata filtering
│   │   └── ingest_corpus.py        # Batch ingestion CLI script for markdown patterns
│   └── knowledge_base/
│       ├── aws_well_architected/   # Curated AWS guidelines (Reliability, Security, Perf)
│       ├── azure_patterns/         # Curated Azure Cloud Design Patterns
│       └── microservices_patterns/ # Canonical microservices remediation patterns
└── tests/
    └── test_rag.py                 # RAG retrieval unit tests, cosine similarity checks
```

---

## 7. Implementation Roadmap & Milestones

| Stage | Milestone | Acceptance Criteria |
| :--- | :--- | :--- |
| **Stage 1: Dependencies & Environment** | Install `chromadb`, `sentence-transformers`, `torch` (CPU), `langchain-text-splitters` in `backend/.venv`. | Clean import verification, zero GPU requirements. |
| **Stage 2: Knowledge Corpus Compilation** | Assemble 60+ curated architectural pattern documents mapped directly to AP-01 through AP-12. | Markdown documents in `knowledge_base/` with verified metadata tags. |
| **Stage 3: Ingestion & Indexing Engine** | Implement `ingest_corpus.py` to chunk, embed, and persist vectors into `backend/data/chromadb/`. | Persistent collection verified with $> 150$ indexed chunks. |
| **Stage 4: Semantic Retriever & Query Service** | Implement `retriever.py` and `query_builder.py` with cosine distance filtering. | Top-3 retrieval latency $< 30\text{ ms}$; relevance score $> 0.75$. |
| **Stage 5: API Integration** | Expose `POST /api/v1/rag/retrieve` and attach retrieved recommendations to `Finding.guidelines`. | Swagger API docs verified; live endpoint returns citations. |
| **Stage 6: Frontend Knowledge Reference UI** | Expand `FindingsPanel` and `NodeDetailsDrawer` to render collapsible "Industry Reference Patterns" with authoritative links. | Clickable citations and implementation steps visible in Next.js UI. |

---

## 8. Summary

Phase 4 elevates ArchLens from an architectural smell detector into an **authoritative architectural consultation engine**. By combining the mathematical certainty of the deterministic rule engine (Phase 2) and the visual clarity of React Flow (Phase 3) with grounded, verified cloud engineering literature (Phase 4), ArchLens guarantees that every reported vulnerability is backed by industry-standard remediation guidance.

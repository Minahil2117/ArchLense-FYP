# ArchLens — AI-Assisted Microservices Architecture Reviewer

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![React Flow](https://img.shields.io/badge/React_Flow-13.0.2-ff0072.svg?logo=react&logoColor=white)](https://reactflow.dev)
[![NetworkX](https://img.shields.io/badge/NetworkX-3.2.1-blue.svg)](https://networkx.org)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-25%20Passed-brightgreen.svg)]()
[![Benchmark Recall](https://img.shields.io/badge/Benchmark_Recall-100%25-success.svg)]()

> **ArchLens** is an automated architecture review platform for distributed cloud-native microservices topologies. It transforms visual Mermaid.js flowcharts and structured JSON architectures into a mathematical property graph, executes a deterministic architectural smell engine, and renders an interactive React Flow graph with real-time finding highlighting.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Key Features](#4-key-features)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [How ArchLens Works](#7-how-archlens-works)
8. [Architecture Analysis Engine](#8-architecture-analysis-engine)
9. [Deterministic Rule Engine (AP-01 to AP-12)](#9-deterministic-rule-engine-ap-01-to-ap-12)
10. [Interactive Architecture Visualization](#10-interactive-architecture-visualization)
11. [RAG Knowledge Base (Implementation Status)](#11-rag-knowledge-base-implementation-status)
12. [Multi-Agent Analysis (Implementation Status)](#12-multi-agent-analysis-implementation-status)
13. [Project Structure](#13-project-structure)
14. [Installation and Setup](#14-installation-and-setup)
15. [Environment Variables](#15-environment-variables)
16. [Running the Backend](#16-running-the-backend)
17. [Running the Frontend](#17-running-the-frontend)
18. [API Documentation](#18-api-documentation)
19. [Testing & Quality Assurance](#19-testing--quality-assurance)
20. [Screenshots & Visual Workflow](#20-screenshots--visual-workflow)
21. [Current Development Status](#21-current-development-status)
22. [Future Improvements](#22-future-improvements)
23. [Team Members](#23-team-members)
24. [Academic Project Information](#24-academic-project-information)

---

## 1. Project Overview

Modern cloud systems increasingly adopt microservices to achieve scalability and team autonomy. However, designing microservices correctly requires careful consideration of service boundaries, data isolation, synchronous call chains, and single points of failure. Architectural defects introduced at the design stage—such as multiple services sharing a database, circular dependency deadlocks, or long synchronous chains—frequently go unnoticed until late in the development lifecycle or during production outages.

**ArchLens** provides automated, design-time architecture review. By ingesting visual architecture diagrams (Mermaid flowchart syntax or structured JSON), ArchLens builds a formal directed property graph, evaluates it against 10 deterministic anti-pattern rules, and visualizes the topology on an interactive canvas with component inspection and finding-based highlighting.

---

## 2. Problem Statement

Microservices architectures suffer from subtle architectural smells that are difficult to identify during informal whiteboard reviews:
- **Distributed Monolith:** Services that appear decoupled on paper but share a single physical database, causing schema lock-in and cascading transactional locks.
- **Hidden Circular Dependencies:** Cyclical call chains between services ($A \to B \to C \to A$) that lead to distributed deadlocks and deployment ordering paradoxes.
- **Cascading Latency Failures:** Deep synchronous HTTP chains ($\ge 4$ hops) where latency accumulates and overall system availability decays exponentially.
- **Subjective / Inconsistent Reviews:** Manual architectural reviews are time-consuming and heavily depend on individual reviewer experience.
- **LLM Hallucinations:** Using general-purpose Large Language Models (LLMs) directly for architecture review often yields fabricated vulnerabilities and misses structural graph attributes like cycles.

---

## 3. Proposed Solution

ArchLens replaces subjective or hallucinated reviews with a **deterministic, graph-theoretic foundation**:
1. **Mathematical Representation:** Ingests Mermaid flowchart syntax and builds a multi-attribute directed property graph $G = (V, E)$ using NetworkX.
2. **Deterministic Anti-Pattern Detection:** Executes 10 graph-theoretic rules with mathematically grounded criteria (degree centrality, simple cycle detection, path traversal, in-degree constraints).
3. **Epistemic Honesty:** Classifies findings into three distinct states:
   - `confirmed`: Structurally proven from graph topology (e.g. shared database, circular dependencies).
   - `potential`: Contextual risk that cannot be fully established from a static diagram alone (e.g. single gateway without explicit clustering).
   - `not_evidenced`: Omission of recommended cloud infrastructure (e.g. missing auth boundary, unevidenced storage redundancy).
4. **Interactive Graph Visualization:** Renders the topology using React Flow (`@xyflow/react`), allowing architects to drag components, zoom/pan, inspect degree metrics, and click any finding to visually highlight its affected components.

---

## 4. Key Features

- **Mermaid Flowchart Ingestion:** Parses Mermaid `flowchart LR/TD` syntax with automated node classification (Services, Databases, Gateways, Caches, Brokers, Clients).
- **10 Deterministic Architecture Rules:** Complete rule engine covering AP-01 through AP-12.
- **Interactive React Flow Canvas:** Fluid canvas with drag-and-drop node positioning, MiniMap, grid background, and controls.
- **Finding-Based Highlighting:** Selecting an architectural finding dynamically highlights all affected components with glowing rose outlines and warning banners while de-emphasizing unrelated services.
- **Component & Relationship Inspector:** Slide-in drawer showing in-degree, out-degree, direct callers, downstream dependencies, and associated rule violations.
- **Multi-Filter Findings Panel:** Filter findings by Category (Security, Scalability, Cost & Maintenance, Reliability, Architecture), Severity (Critical, High, Medium, Low), and Status (`confirmed`, `potential`, `not_evidenced`).
- **Real-Time Telemetry Drawer:** Displays per-rule execution latency (average execution under 1.5ms across all 10 rules).
- **24 Pre-Loaded Benchmark Scenarios:** Built-in test corpus spanning E-commerce, Banking, Food Delivery, Video Streaming, Healthcare, and Social Media.
- **Dual-View Studio:** Seamlessly switch between the **Interactive Flow (React Flow)** canvas and the classic **Mermaid SVG** preview.

---

## 5. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│               Client Presentation Layer (Next.js 16 + React 19)        │
│  ┌────────────────────┐   ┌────────────────────────┐   ┌────────────┐  │
│  │ Mermaid Editor     │   │ Interactive React Flow │   │ Findings   │  │
│  │ (Debounced AST)    │   │ Canvas (@xyflow/react) │   │ Panel      │  │
│  └─────────┬──────────┘   └───────────▲────────────┘   └─────▲──────┘  │
└────────────┼──────────────────────────┼──────────────────────┼─────────┘
             │ HTTP (JSON)              │ Component Highlight  │ Results
┌────────────▼──────────────────────────┴──────────────────────┴─────────┐
│                    API Gateway & Routing (FastAPI)                     │
│    POST /api/v1/architecture/parse    POST /api/v1/architecture/analyze │
└────────────┬─────────────────────────────────────────────────┬─────────┘
             │                                                 │
┌────────────▼──────────────────────┐         ┌────────────────▼─────────┐
│   Mermaid Regex & AST Parser      │         │ NetworkX Graph Builder   │
│   (Tokenization & Classification) │────────►│ MultiDiGraph G = (V, E)  │
└───────────────────────────────────┘         └────────────────┬─────────┘
                                                               │
                                              ┌────────────────▼─────────┐
                                              │ Deterministic Rule Engine│
                                              │ (AP-01 through AP-12)    │
                                              └────────────────┬─────────┘
                                                               │
                                              ┌────────────────▼─────────┐
                                              │ Severity & Health Policy │
                                              │ (Score: 0–100, Penalties)│
                                              └──────────────────────────┘
```

For complete technical diagrams and module specifications, see [docs/PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md).

---

## 6. Technology Stack

### Frontend
- **Framework:** Next.js 16.4.6 (App Router, Turbopack)
- **Library:** React 19.3.0
- **Language:** TypeScript 5.0+
- **Styling:** Tailwind CSS 4.3.3 (Dark-mode SaaS theme)
- **Graph Visualization:** `@xyflow/react` 13.0.2 (React Flow)
- **Icons:** Lucide React 1.75.0
- **Fallback Diagram Engine:** Mermaid.js 12.3.0
- **Testing:** `tsx` + Node.js native test runner

### Backend
- **Framework:** FastAPI 0.111.0
- **ASGI Server:** Uvicorn 0.30.0
- **Language:** Python 3.10+ (tested on Python 3.10–3.13)
- **Graph Theory Engine:** NetworkX 3.2.1
- **Data Validation:** Pydantic 2.7.0+
- **Testing:** Pytest 8.0+, HTTPX 0.27.0

---

## 7. How ArchLens Works

1. **Input:** The user types or pastes Mermaid flowchart code (e.g. `flowchart LR`) or selects one of the 24 pre-loaded benchmark scenarios in the Architecture Studio.
2. **Parsing:** The frontend debounces input by 350ms and calls `/api/v1/architecture/parse`. The backend parser validates syntax and returns normalized `nodes` and `edges`.
3. **Graph Rendering:** React Flow converts the normalized graph into custom architecture nodes, calculates tiered coordinates, and displays the topology.
4. **Analysis:** The user clicks **"Analyze Architecture"**, triggering `/api/v1/architecture/analyze`.
5. **Rule Execution:** NetworkX evaluates 10 deterministic architectural rules, measuring execution latency in microseconds.
6. **Results & Scoring:** The backend aggregates findings, applies the severity scoring policy (0–100 health score), and returns structured findings.
7. **Interactive Inspection:** The user selects any finding. The React Flow canvas highlights affected nodes and edges, de-emphasizes unaffected services, and auto-focuses the problem cluster.

---

## 8. Architecture Analysis Engine

The backend analysis engine operates strictly on graph theory:
- **Directed Graph Representation:** Topologies are converted to a `networkx.MultiDiGraph` preserving node attributes (`id`, `label`, `type`) and edge attributes (`source`, `target`, `communication`, `protocol`).
- **Cycle Preservation:** Cycles are intentionally preserved (no forced Directed Acyclic Graph conversion).
- **Topology Statistics:** Automatically computes total nodes, edges, microservices, databases, caches, message brokers, API gateways, external clients, and detected cycle counts.

---

## 9. Deterministic Rule Engine (AP-01 to AP-12)

| Rule ID | Anti-Pattern Name | Category | Severity | Status | Detection Criterion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AP-01** | High Service Coupling | Architecture | Medium / High | `confirmed` | Total degree $d(u) = d_{\text{in}}(u) + d_{\text{out}}(u)$ exceeds topology cluster density threshold. |
| **AP-02** | Shared Database Dependency | Architecture | Critical / High | `confirmed` | In-degree on a database node from microservices is $\ge 2$ (Distributed Monolith). |
| **AP-03** | Circular Dependency | Reliability | High | `confirmed` | Directed simple cycle ($k \ge 2$) detected in the microservice subgraph. |
| **AP-04** | Single Point of Failure (SPOF) | Reliability | High / Medium | `potential` | Central ingress gateway or isolated broker funneling all critical request paths. |
| **AP-05** | Long Synchronous Chain | Scalability | High | `potential` | Directed synchronous request chain traverses $\ge 4$ consecutive service hops. |
| **AP-06** | Storage Redundancy Not Evidenced | Reliability | Medium | `not_evidenced` | Persistent datastore lacks secondary replica, standby, or clustered failover notation. |
| **AP-07** | Scalability Bottleneck | Scalability | High | `potential` | Outgoing synchronous fan-out $\ge 4$ or direct synchronous compute-intensive pipeline. |
| **AP-08** | Async Decoupling Not Evidenced | Scalability | Medium | `not_evidenced` | Multi-service workflow ($\ge 4$ services) contains zero message brokers or queues. |
| **AP-09** | Auth Boundary Not Evidenced | Security | High | `not_evidenced` | External client connects directly to internal services without an auth gateway. |
| **AP-12** | Observability Not Evidenced | Cost & Maintenance | Low | `not_evidenced` | Distributed microservices ($\ge 4$) lack APM, tracing, or OpenTelemetry components. |

For detailed algorithmic formulas, Mermaid examples, and remediation guidelines, see the [Architectural Rule Catalog](docs/ARCHITECTURAL_RULE_CATALOG.md).

---

## 10. Interactive Architecture Visualization

Built using **`@xyflow/react`**, the visualization subsystem provides:
- **Custom Architecture Nodes:** Distinct styling for 9 component types with Lucide icons and in/out-degree telemetry ($\downarrow 2$, $\uparrow 3$).
- **Custom Communication Edges:** Solid lines for synchronous calls, animated dashed lines for asynchronous queues, and communication badges (`HTTP`, `gRPC`, `async`, `db`).
- **Deterministic Tiered Layout:** In-memory hierarchical positioning placing components across natural architectural tiers without external layout dependencies.
- **Orientation Toggle:** One-click switching between **Left-to-Right (`LR`)** and **Top-to-Bottom (`TB`)** orientations.
- **Component Inspector Drawer:** Slide-in panel displaying component metadata, degree metrics, direct callers, downstream dependencies, and associated rule violations.
- **Finding Highlighting:** Selecting a finding outlines affected components in glowing rose/red borders and focuses the viewport.

---

## 11. RAG Knowledge Base (Implementation Status)

- **Status:** **PLANNED (Phase 4)** — *Not yet implemented in current codebase.*
- **Planned Scope:**
  - Embeddings: Sentence-Transformers (`BAAI/bge-small-en-v1.5`, 384 dimensions).
  - Vector Store: Local embedded ChromaDB (`backend/data/chromadb`).
  - Corpus: Curated guidelines from AWS Well-Architected Framework (Reliability, Security, Performance Efficiency), Microsoft Azure Architecture Center, and canonical microservices patterns.
  - Objective: When a deterministic finding is detected, retrieve verified cloud engineering remediation blueprints with authoritative citations.
  - Detailed blueprint: [docs/PHASE_4_IMPLEMENTATION_PLAN.md](docs/PHASE_4_IMPLEMENTATION_PLAN.md).

---

## 12. Multi-Agent Analysis (Implementation Status)

- **Status:** **PLANNED (Phase 5)** — *Not yet implemented in current codebase.*
- **Planned Scope:**
  - Framework: LangGraph coordinating three specialized agent roles:
    1. *Security Review Agent*
    2. *Scalability Review Agent*
    3. *Cost & Maintenance Agent*
  - LLM Providers: Groq API (Llama 3.3 70B) with local Ollama (Llama 3.1 8B) fallback.
  - Report Generation: Synthesis of findings into exportable PDF and Markdown audit reports.

---

## 13. Project Structure

```text
ArchLens/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py         # REST endpoints: /parse, /analyze, /rules
│   │   ├── graph_engine/
│   │   │   ├── analyzer.py       # Graph analysis engine & statistics
│   │   │   └── graph_builder.py  # NetworkX MultiDiGraph conversion
│   │   ├── parser/
│   │   │   ├── mermaid_parser.py # Deterministic Mermaid AST parser
│   │   │   └── node_types.py     # Heuristic node classification
│   │   ├── rules/                # 10 deterministic rule modules
│   │   │   ├── base.py           # BaseRule abstract class
│   │   │   ├── registry.py       # RuleRegistry with execution profiling
│   │   │   ├── ap_01_coupling.py through ap_12_observability.py
│   │   │   └── __init__.py
│   │   ├── schemas/              # Pydantic schemas
│   │   │   ├── analysis.py       # AnalyzeRequest, AnalyzeResponse, GraphStatistics
│   │   │   ├── finding.py        # Finding, Severity, Status, Category schemas
│   │   │   └── graph.py          # Node, Edge, ArchitectureGraph schemas
│   │   ├── scoring/
│   │   │   └── severity_policy.py# Severity deduction weighting (0-100)
│   │   └── main.py               # FastAPI entry point & CORS configuration
│   ├── tests/
│   │   ├── test_api.py           # API integration tests
│   │   ├── test_graph_engine.py  # Graph construction & cycle tests
│   │   ├── test_parser.py        # Mermaid syntax parsing tests
│   │   └── test_rules.py         # Unit tests for all 10 architectural rules
│   ├── evaluate_benchmark.py     # Evaluation runner across 24 benchmark cases
│   ├── export_cases_to_ts.py     # Benchmark synchronization utility
│   ├── verify_live_api.py        # Live end-to-end integration verifier
│   ├── pytest.ini
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css       # Tailwind v4 styles + React Flow styles
│   │   │   ├── layout.tsx        # Root HTML layout
│   │   │   └── page.tsx          # Main SaaS dashboard & studio controller
│   │   ├── components/
│   │   │   ├── flow/             # React Flow visualization subsystem
│   │   │   │   ├── ArchitectureGraphViewer.tsx # Main canvas component
│   │   │   │   ├── CustomArchitectureNode.tsx  # Custom node card component
│   │   │   │   ├── CustomArchitectureEdge.tsx  # Custom edge component
│   │   │   │   ├── NodeDetailsDrawer.tsx       # Component inspector drawer
│   │   │   │   ├── graphAdapter.ts             # Graph -> React Flow adapter
│   │   │   │   ├── graphLayout.ts              # Tiered layout algorithm
│   │   │   │   └── types.ts                    # Visualization type definitions
│   │   │   ├── FindingsPanel.tsx # Multi-filter findings list & telemetry
│   │   │   ├── GraphMetrics.tsx  # Topology metrics cards
│   │   │   ├── MermaidViewer.tsx # Static Mermaid SVG renderer
│   │   │   └── Sidebar.tsx       # Dark-mode navigation sidebar
│   │   ├── lib/
│   │   │   ├── api.ts            # Typed REST API client
│   │   │   └── benchmarkCases.ts # 24 pre-loaded benchmark scenarios
│   │   └── types/
│   │       └── architecture.ts   # Shared TypeScript type definitions
│   ├── tests/
│   │   └── flowGraph.test.ts     # Frontend unit tests (layout, conversion, highlight)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── datasets/
│   ├── mermaid_cases/            # 24 individual Mermaid test files (.mmd)
│   ├── archlens_benchmark_24_cases.json # Full benchmark suite with metadata
│   ├── expected_findings.csv     # Ground-truth annotations for evaluation
│   └── README.md
├── docs/
│   ├── PROJECT_ARCHITECTURE.md   # System architecture & technical specification
│   ├── ARCHITECTURAL_RULE_CATALOG.md # Algorithmic catalog of all 10 rules
│   ├── PHASE_2_IMPLEMENTATION_REPORT.md # Phase 2 benchmark evaluation report
│   ├── PHASE_3_IMPLEMENTATION_REPORT.md # Phase 3 React Flow implementation report
│   ├── PHASE_4_IMPLEMENTATION_PLAN.md   # Phase 4 RAG implementation blueprint
│   ├── benchmark_evaluation_results.json# Empirical benchmark results
│   └── sample_diagrams/          # Sample architecture diagrams (.mmd)
├── .env.example                  # Root environment template
├── .gitignore                    # Comprehensive repository ignore rules
├── run_backend.bat               # 1-Click launcher for FastAPI backend
├── run_frontend.bat              # 1-Click launcher for Next.js frontend
├── run_all.bat                   # 1-Click launcher for both services
└── README.md                     # Main documentation
```

---

## 14. Installation and Setup

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 20.x or higher (tested on Node v24)
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/Minahil2117/ArchLense-FYP.git
cd ArchLense-FYP
```

### Step 2: Configure Environment Variables
```bash
# Root template
cp .env.example .env

# Frontend environment
cp frontend/.env.example frontend/.env.local

# Backend environment
cp backend/.env.example backend/.env
```

### Step 3: Set Up Python Backend
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Set Up Frontend
```bash
cd ../frontend
npm install
```

---

## 15. Environment Variables

ArchLens functions out of the box with default local ports. No external API keys are required for Phase 1–3 functionality.

| Variable | Location | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/.env.local` | `http://localhost:8000` | Backend API base URL accessed by the frontend. |
| `HOST` | `backend/.env` | `127.0.0.1` | Host address for FastAPI backend. |
| `PORT` | `backend/.env` | `8000` | Port for FastAPI backend. |
| `CORS_ORIGINS` | `backend/.env` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed CORS origins. |

---

## 16. Running the Backend

From the repository root:
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Alternatively, on Windows, double-click `run_backend.bat`.

- **API Root:** [http://localhost:8000](http://localhost:8000)
- **Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 17. Running the Frontend

From the repository root:
```bash
cd frontend
npm run dev
```
Alternatively, on Windows, double-click `run_frontend.bat`.

- **Dashboard:** [http://localhost:3000](http://localhost:3000)

To start both services simultaneously on Windows, double-click `run_all.bat`.

---

## 18. API Documentation

### Liveness Check
```http
GET /health
```
**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "archlens-api",
  "version": "0.1.0"
}
```

### Parse Architecture Diagram
```http
POST /api/v1/architecture/parse
Content-Type: application/json

{
  "mermaid_code": "flowchart LR\n  Client([Web]) --> Gateway[API Gateway]\n  Gateway --> OrderService[Order Service]"
}
```
**Response (200 OK):** Returns canonical `ArchitectureGraph` (`nodes`, `edges`, `parse_warnings`).

### Analyze Architecture
```http
POST /api/v1/architecture/analyze
Content-Type: application/json

{
  "mermaid_code": "flowchart TD\n  OrderService --> CoreDB[(PostgreSQL)]\n  PaymentService --> CoreDB",
  "enabled_rules": ["AP-01", "AP-02", "AP-03", "AP-04", "AP-05", "AP-06", "AP-07", "AP-08", "AP-09", "AP-12"]
}
```
**Response (200 OK):** Returns structured `findings`, `statistics`, overall architecture health `score` (0–100), and per-rule `rule_metadata` latency telemetry.

---

## 19. Testing & Quality Assurance

### Run Frontend Unit Tests
```bash
cd frontend
npm test
```
**Results:** `7 passed in ~600ms` (Layout, graph conversion, finding highlighting).

### Run Frontend Linting & Build
```bash
cd frontend
npm run lint    # 0 errors, 0 warnings
npm run build   # Production static asset generation via Turbopack
```

### Run Backend Unit Tests
```bash
cd backend
.venv\Scripts\pytest -v
```
**Results:** `18 passed in 3.62s` (100% pass rate).

### Run 24-Case Benchmark Evaluation
```bash
cd backend
.venv\Scripts\python.exe evaluate_benchmark.py
```
**Results:**
- Parser Pass Rate: **24 / 24 (100.0%)**
- Expected Ground-Truth Violations Detected: **28 / 28 (100.0% Recall, 0 False Negatives)**
- Perfect F1-Score (1.00): **AP-02, AP-03, AP-07, AP-09**

---

## 20. Screenshots & Visual Workflow

To explore the user interface:
1. Start the application and visit `http://localhost:3000`.
2. **Dashboard Tab:** View pre-loaded benchmark cases across 6 enterprise domains with status badges and quick-audit triggers.
3. **Architecture Studio Tab:**
   - Select `ARCH-002: Shared DB E-commerce` from the dropdown.
   - Interact with the **Interactive Flow** canvas: drag nodes to rearrange, zoom in/out, pan, or toggle orientation (`LR`/`TB`).
   - Click **"Analyze Architecture"**.
   - In the findings panel, click `[AP-02] Shared Database Dependency Across Services`.
   - **Visual Result:** The affected services (`OrderService`, `PaymentService`, `CatalogService`) and the shared database illuminate in glowing rose/red outlines with `AFFECTED COMPONENT` badges, interconnecting edges turn red, and the canvas centers on the cluster.
   - Click any node to open the **Component Inspector** slide-in drawer showing in/out-degree and callers.

---

## 21. Current Development Status

- [x] **Phase 1: Foundation & Architecture Ingestion** — *Completed*
  - Mermaid flowchart parser, NetworkX graph engine, initial AP-02 rule, Next.js dashboard.
- [x] **Phase 2: Deterministic Architecture Rule Engine** — *Completed*
  - 10 active rules (AP-01 to AP-12), Pydantic unified finding schema, severity policy, 24-case benchmark evaluation with 100% recall.
- [x] **Phase 3: Interactive Architecture Visualization** — *Completed*
  - React Flow (`@xyflow/react`) canvas, custom nodes/edges, tiered layout, finding-based highlighting, component inspector drawer, dual-mode studio view.
- [ ] **Phase 4: RAG Knowledge Base** — *Planned (See [docs/PHASE_4_IMPLEMENTATION_PLAN.md](docs/PHASE_4_IMPLEMENTATION_PLAN.md))*
  - ChromaDB vector store, Sentence-Transformers embeddings, AWS/Azure pattern ingestion.
- [ ] **Phase 5: Multi-Agent Architecture Review Team** — *Planned*
  - LangGraph orchestration, specialized reviewer agents (Security, Scalability, Cost), automated PDF/Markdown report export.

---

## 22. Future Improvements

- **Subgraphs & Namespaces:** Visual bounding box grouping inside React Flow for nested namespaces.
- **Direct Architecture Editing:** Support adding and connecting components directly on the React Flow canvas with automatic bidirectional sync to Mermaid syntax.
- **CI/CD Integration:** A headless CLI mode for running ArchLens rules inside GitHub Actions pull-request workflows.

---

## 23. Team Members

- **Minahil Fatima** — *Roll No:* UOC-BSCS-F23-022
- **Maryam Noor** — *Roll No:* UOC-BSCS-F23-014
- **Sehr Afreen** — *Roll No:* UOC-BSCS-F23-002

---

## 24. Academic Project Information

- **Project:** Final Year Project (FYP)
- **Degree:** Bachelor of Science in Computer Science (BSCS)
- **Department:** Department of Computer Science & Information Technology
- **Institution:** The University of Chakwal (UOC), Punjab, Pakistan
- **Project Supervisor:** Mam Hina Iftikhar
- **Academic Year:** 2026–2027

# ArchLens Benchmark Dataset — v1.0

## Contents
- `archlens_benchmark_24_cases.json`: canonical machine-readable dataset. Each case includes Mermaid input and expected findings.
- `expected_findings.csv`: flattened expected-finding table for manual review and evaluation.
- `README.md`: usage and evaluation guidance.

## Dataset composition
24 Mermaid architecture cases across:
1. E-commerce (ARCH-001–004)
2. Banking (ARCH-005–008)
3. Food Delivery (ARCH-009–012)
4. Streaming (ARCH-013–016)
5. Healthcare (ARCH-017–020)
6. Social Media (ARCH-021–024)

## Suggested rule IDs
- AP-01: Excessive service coupling
- AP-02: Shared database across services
- AP-03: Circular service dependencies
- AP-04: Potential single point of failure
- AP-05: Long synchronous dependency chain
- AP-06: Redundancy/failover not evidenced
- AP-07: Potential scalability bottleneck
- AP-08: Asynchronous communication not evidenced / potentially useful
- AP-09: Authentication boundary not evidenced
- AP-12: Observability not evidenced

These are proposed benchmark rule identifiers, not a claim that every property can be conclusively determined from a diagram.

## Critical interpretation rules
1. `confirmed` means the represented graph explicitly supports the finding.
2. `potential` means the diagram suggests a concern or omits evidence. Do not report it as a confirmed vulnerability.
3. A missing icon or component in a diagram does not prove that the capability is absent from the deployed system.
4. Do not infer cost overruns or resource over-provisioning without workload, instance, sizing, or cloud pricing metadata.
5. A directed graph should preserve cycles. Do not force all input into a DAG before checking AP-03.
6. Baseline cases are not guaranteed secure or production-ready; they simply have no deliberately seeded topology issue.

## Recommended evaluation workflow
- Split the cases into development/tuning and holdout sets before tuning prompts or rules.
- Suggested initial split: 18 development cases and 6 holdout cases, stratified by domain and finding type.
- For deterministic graph rules, calculate precision, recall, and F1 at the finding level using `rule_id` as the matching key.
- Evaluate status and severity separately. A matching rule with the wrong status or severity should be reported as a partial mismatch, not a perfect match.
- For AI-generated recommendations, use a human rubric: factual grounding, relevance, actionability, and citation support.
- Report results per rule and overall; do not claim model accuracy from only a few hand-picked examples.

## Important limitation
This is a starter benchmark dataset authored for development. Before using it as final research evidence:
- Have your supervisor/domain reviewer validate the expected labels.
- Add more diverse diagrams and edge cases.
- Keep a truly unseen holdout set.
- Version the dataset and document any label changes.

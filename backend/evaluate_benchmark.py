"""
ArchLens 24-Case Benchmark Evaluation Script.
Evaluates the deterministic rule engine against ground-truth labels from expected_findings.csv.
Calculates Precision, Recall, F1 score, and reports False Positives and False Negatives.
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
from app.parser.mermaid_parser import MermaidParser
from app.graph_engine.analyzer import ArchitectureGraphEngine

BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "datasets"
BENCHMARK_JSON = DATASETS_DIR / "archlens_benchmark_24_cases.json"
EXPECTED_CSV = DATASETS_DIR / "expected_findings.csv"


def load_expected_findings():
    expected = defaultdict(set)
    with open(EXPECTED_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row["case_id"]
            rule = row["rule_id"]
            if rule != "NONE":
                expected[cid].add(rule)
    return expected


def run_evaluation():
    with open(BENCHMARK_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    expected_map = load_expected_findings()
    cases = data.get("cases", [])

    total_cases = len(cases)
    parser_successes = 0

    # Rule-level metrics tracking: rule -> {TP, FP, FN}
    rule_metrics = defaultdict(lambda: {"TP": 0, "FP": 0, "FN": 0})
    case_results = []

    print("=" * 80)
    print(f"RUNNING ARCHLENS BENCHMARK EVALUATION ({total_cases} CASES)")
    print("=" * 80)

    for c in cases:
        cid = c["case_id"]
        domain = c.get("domain", "")
        name = c.get("name", "")
        mermaid = c["input"]["content"]

        try:
            graph = MermaidParser.parse(mermaid)
            parser_successes += 1
        except Exception as e:
            case_results.append({
                "case_id": cid,
                "status": "PARSE_ERROR",
                "error": str(e)
            })
            continue

        engine = ArchitectureGraphEngine(graph)
        stats, findings, meta = engine.run_all_checks()

        detected_rules = {f.rule_id for f in findings}
        expected_rules = expected_map.get(cid, set())

        # Calculate TP, FP, FN for this case
        tp = detected_rules.intersection(expected_rules)
        fp = detected_rules - expected_rules
        fn = expected_rules - detected_rules

        # Accumulate in rule metrics
        for r in tp:
            rule_metrics[r]["TP"] += 1
        for r in fp:
            rule_metrics[r]["FP"] += 1
        for r in fn:
            rule_metrics[r]["FN"] += 1

        match_status = "PERFECT_MATCH" if tp == expected_rules and not fp else "MISMATCH"

        case_results.append({
            "case_id": cid,
            "domain": domain,
            "name": name,
            "expected": sorted(list(expected_rules)),
            "detected": sorted(list(detected_rules)),
            "true_positives": sorted(list(tp)),
            "false_positives": sorted(list(fp)),
            "false_negatives": sorted(list(fn)),
            "status": match_status
        })

        icon = "OK" if match_status == "PERFECT_MATCH" else "DIFF"
        print(f"[{icon}] {cid} ({domain}): Exp={sorted(list(expected_rules))} | Det={sorted(list(detected_rules))}")

    print("\n" + "=" * 80)
    print("RULE-WISE EVALUATION METRICS")
    print("=" * 80)
    print(f"{'Rule ID':<10} {'TP':<6} {'FP':<6} {'FN':<6} {'Precision':<12} {'Recall':<12} {'F1-Score':<10}")
    print("-" * 80)

    total_tp = sum(m["TP"] for m in rule_metrics.values())
    total_fp = sum(m["FP"] for m in rule_metrics.values())
    total_fn = sum(m["FN"] for m in rule_metrics.values())

    all_rules = sorted(list(set(list(rule_metrics.keys()) + [r for exp in expected_map.values() for r in exp])))

    for r in all_rules:
        m = rule_metrics[r]
        tp = m["TP"]
        fp = m["FP"]
        fn = m["FN"]

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        print(f"{r:<10} {tp:<6} {fp:<6} {fn:<6} {prec:<12.2%} {rec:<12.2%} {f1:<10.2f}")

    overall_prec = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    overall_rec = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    overall_f1 = (2 * overall_prec * overall_rec) / (overall_prec + overall_rec) if (overall_prec + overall_rec) > 0 else 0.0

    print("-" * 80)
    print(f"{'OVERALL':<10} {total_tp:<6} {total_fp:<6} {total_fn:<6} {overall_prec:<12.2%} {overall_rec:<12.2%} {overall_f1:<10.2f}")
    print(f"\nParser Pass Rate: {parser_successes}/{total_cases} ({parser_successes/total_cases:.1%})")

    # Save benchmark report to docs/
    report_path = BASE_DIR / "docs" / "benchmark_evaluation_results.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "parser_success_rate": parser_successes / total_cases,
            "overall_precision": overall_prec,
            "overall_recall": overall_rec,
            "overall_f1": overall_f1,
            "rule_metrics": dict(rule_metrics),
            "cases": case_results
        }, f, indent=2)

    print(f"Results saved to {report_path}")
    return case_results, rule_metrics


if __name__ == "__main__":
    run_evaluation()

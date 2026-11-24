import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
source = BASE_DIR / "datasets" / "archlens_benchmark_24_cases.json"
with open(source, "r", encoding="utf-8") as f:
    data = json.load(f)

cases = data.get("cases", [])
ts_cases = []
for c in cases:
    ts_cases.append({
        "case_id": c.get("case_id"),
        "domain": c.get("domain"),
        "name": c.get("name"),
        "description": c.get("description"),
        "mermaid": c.get("input", {}).get("content", ""),
        "expected_count": len(c.get("expected_findings", [])),
    })

out_file = BASE_DIR / "frontend" / "src" / "lib" / "benchmarkCases.ts"
with open(out_file, "w", encoding="utf-8") as f:
    f.write('export interface BenchmarkCase {\n')
    f.write('  case_id: string;\n  domain: string;\n  name: string;\n  description: string;\n  mermaid: string;\n  expected_count: number;\n}\n\n')
    f.write('export const BENCHMARK_CASES: BenchmarkCase[] = ')
    f.write(json.dumps(ts_cases, indent=2))
    f.write(';\n')

print(f"Exported {len(ts_cases)} benchmark cases to TypeScript!")

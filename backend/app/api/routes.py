"""
FastAPI Route Handlers for ArchLens Architecture Parsing and Analysis.
"""

from fastapi import APIRouter, HTTPException, status
from ..schemas.analysis import (
    ParseRequest,
    ParseResponse,
    AnalyzeRequest,
    AnalyzeResponse
)
from ..schemas.graph import ArchitectureGraph
from ..parser.mermaid_parser import MermaidParser
from ..graph_engine.analyzer import ArchitectureGraphEngine

router = APIRouter(prefix="/api/v1/architecture", tags=["Architecture Analysis"])


def _parse_input_to_graph(mermaid_code: str | None, json_data: dict | None) -> ArchitectureGraph:
    """Helper to convert either Mermaid string or structured JSON into ArchitectureGraph."""
    if mermaid_code and mermaid_code.strip():
        return MermaidParser.parse(mermaid_code)
    elif json_data:
        try:
            return ArchitectureGraph(**json_data)
        except Exception as e:
            raise ValueError(f"Invalid JSON architecture structure: {e}")
    else:
        raise ValueError("Either 'mermaid_code' or 'json_data' must be provided.")


@router.post("/parse", response_model=ParseResponse, status_code=status.HTTP_200_OK)
def parse_architecture(request: ParseRequest) -> ParseResponse:
    """
    Parses a Mermaid.js diagram or JSON topology into a normalized graph schema.
    Returns extracted nodes, directed edges, and parser warnings.
    """
    try:
        graph = _parse_input_to_graph(request.mermaid_code, request.json_data)
        warning_messages = [w.message for w in graph.parse_warnings]
        return ParseResponse(
            success=True,
            graph=graph,
            parse_warnings=warning_messages,
            error=None
        )
    except ValueError as ve:
        return ParseResponse(
            success=False,
            graph=ArchitectureGraph(),
            parse_warnings=[],
            error=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse architecture: {str(e)}"
        )


@router.post("/analyze", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
def analyze_architecture(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Parses the architecture diagram and executes the modular deterministic rule engine.
    Evaluates rules (AP-01 to AP-12), computes topological statistics, and returns findings.
    """
    try:
        graph = _parse_input_to_graph(request.mermaid_code, request.json_data)
        engine = ArchitectureGraphEngine(graph)
        statistics, findings, rule_metadata = engine.run_all_checks(
            enabled_rules=request.enabled_rules
        )

        summary_text = (
            f"Analyzed {statistics.total_nodes} nodes and {statistics.total_edges} connections. "
            f"Evaluated {len(rule_metadata)} rules, producing {len(findings)} architectural finding(s) "
            f"and detecting {statistics.cycle_count} directed cycle(s)."
        )

        return AnalyzeResponse(
            success=True,
            graph=graph,
            statistics=statistics,
            findings=findings,
            summary=summary_text,
            rule_metadata=rule_metadata,
            error=None
        )
    except ValueError as ve:
        return AnalyzeResponse(
            success=False,
            graph=ArchitectureGraph(),
            statistics=engine.compute_statistics() if 'engine' in locals() else None,  # type: ignore
            findings=[],
            summary="Parsing failed.",
            rule_metadata=[],
            error=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis failed: {str(e)}"
        )

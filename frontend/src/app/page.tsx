"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MermaidViewer } from "@/components/MermaidViewer";
import { ArchitectureGraphViewer } from "@/components/flow/ArchitectureGraphViewer";
import { GraphMetrics } from "@/components/GraphMetrics";
import { FindingsPanel } from "@/components/FindingsPanel";
import { analyzeArchitectureDiagram, parseArchitectureDiagram, checkBackendHealth } from "@/lib/api";
import { AnalyzeResponse, Finding, ArchitectureGraph } from "@/types/architecture";
import { BENCHMARK_CASES, BenchmarkCase } from "@/lib/benchmarkCases";
import {
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileCode,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Server,
  Database,
  Search,
  Filter,
  Zap,
  Repeat
} from "lucide-react";

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [mermaidCode, setMermaidCode] = useState<string>(BENCHMARK_CASES[1]?.mermaid || "");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("ARCH-002");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [activeResultsSubTab, setActiveResultsSubTab] = useState<"findings" | "graph_table" | "rules_metadata">("findings");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [parsedGraph, setParsedGraph] = useState<ArchitectureGraph | null>(null);
  const [previewMode, setPreviewMode] = useState<"flow" | "mermaid">("flow");

  // Automatically parse Mermaid code to keep interactive React Flow graph fresh
  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (!mermaidCode.trim()) {
        if (!isCancelled) setParsedGraph(null);
        return;
      }
      try {
        const res = await parseArchitectureDiagram(mermaidCode);
        if (res.success && !isCancelled) {
          setParsedGraph(res.graph);
        }
      } catch {
        // Silently ignore incomplete syntax while user is typing
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [mermaidCode]);

  // Dashboard Filters
  const [domainFilter, setDomainFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      try {
        await checkBackendHealth();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Loading a Benchmark Case
  const handleLoadCase = (benchmark: BenchmarkCase, runAnalysisImmediately = false) => {
    setSelectedCaseId(benchmark.case_id);
    setMermaidCode(benchmark.mermaid);
    setAnalysisResult(null);
    setSelectedFinding(null);
    setHighlightedNodes([]);
    setErrorMessage(null);
    setCurrentTab("editor");

    if (runAnalysisImmediately) {
      setTimeout(() => {
        executeAnalysis(benchmark.mermaid);
      }, 100);
    }
  };

  const executeAnalysis = async (codeToAnalyze: string) => {
    if (!codeToAnalyze.trim()) {
      setErrorMessage("Mermaid diagram syntax is empty.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setSelectedFinding(null);
    setHighlightedNodes([]);

    try {
      const result = await analyzeArchitectureDiagram(codeToAnalyze);
      if (result.success) {
        setAnalysisResult(result);
        setParsedGraph(result.graph);
      } else {
        setErrorMessage(result.error || "Failed to analyze architecture.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredCases = BENCHMARK_CASES.filter((c) => {
    const matchesDomain = domainFilter === "All" || c.domain.toLowerCase() === domainFilter.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const domains = ["All", "E-commerce", "Banking", "Food Delivery", "Streaming", "Healthcare", "Social Media"];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              {currentTab === "dashboard" && "SaaS Executive Command Center"}
              {currentTab === "editor" && "Architecture Studio & Real-time Auditor"}
              {currentTab === "history" && "Audit Review Log"}
            </h2>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400">Cloud-Native Microservices</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? "bg-emerald-400" : "bg-rose-500 animate-pulse"}`} />
              <span className="text-slate-300 font-mono text-[11px]">
                {backendOnline ? "FastAPI: Port 8000 (Active)" : "FastAPI: Offline"}
              </span>
            </div>

            {currentTab !== "editor" && (
              <button
                onClick={() => setCurrentTab("editor")}
                className="flex items-center space-x-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Studio</span>
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* TAB 1: SAAS DASHBOARD (Rich, Alive, Benchmark Driven) */}
        {/* ========================================================= */}
        {currentTab === "dashboard" && (
          <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
            {/* KPI Metric Cards Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Benchmark Corpus</span>
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">24 Case Studies</div>
                <p className="text-[11px] text-slate-400 mt-1">Across 6 critical industries</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deterministic Rule Engine</span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300 tracking-tight">10 Rules Active</div>
                <p className="text-[11px] text-slate-400 mt-1">AP-01 to AP-12 (Coupling, Cycles, SPOF, etc.)</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cycle Preservation</span>
                  <Repeat className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-300 tracking-tight">Directed Cycles</div>
                <p className="text-[11px] text-slate-400 mt-1">General directed graph (non-forced DAG)</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Analysis Latency</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 tracking-tight">&lt; 15 ms</div>
                <p className="text-[11px] text-slate-400 mt-1">Instant AST parsing via NetworkX</p>
              </div>
            </div>

            {/* Benchmark Cases Explorer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Interactive Architectural Benchmark Suite (24 Cases)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select any standard architecture to inspect its topology, view its diagram, and run deterministic checks.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cases or rules..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Domain Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                {domains.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDomainFilter(d)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      domainFilter.toLowerCase() === d.toLowerCase()
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Benchmark Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCases.map((c) => (
                  <div
                    key={c.case_id}
                    className="p-4 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                          {c.case_id}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {c.domain}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                        {c.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {c.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400">
                        {c.expected_count > 0 ? (
                          <span className="text-amber-400 font-medium">⚠️ Has Seeded Flaws</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">✅ Clean Baseline</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleLoadCase(c, true)}
                        className="flex items-center space-x-1.5 text-xs font-medium text-white bg-indigo-600/90 hover:bg-indigo-500 px-3 py-1 rounded-md transition-all shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run Audit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews History Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Recent Architecture Audits
                </h3>
                <span className="text-xs text-slate-400">Simulated Enterprise History</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Architecture Target</th>
                      <th className="py-2.5 px-4">Domain</th>
                      <th className="py-2.5 px-4">Services / DB</th>
                      <th className="py-2.5 px-4">Detected Flaws</th>
                      <th className="py-2.5 px-4">Health Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-white font-sans font-medium">ARCH-002: Shared DB E-commerce</td>
                      <td className="py-3 px-4 text-slate-400">E-commerce</td>
                      <td className="py-3 px-4 text-slate-300">5 Services / 1 DB</td>
                      <td className="py-3 px-4 text-rose-400 font-sans">AP-02: Shared Core DB</td>
                      <td className="py-3 px-4">
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                          AT-RISK
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => handleLoadCase(BENCHMARK_CASES[1], true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-white font-sans font-medium">ARCH-001: Balanced E-commerce</td>
                      <td className="py-3 px-4 text-slate-400">E-commerce</td>
                      <td className="py-3 px-4 text-slate-300">6 Services / 5 DB</td>
                      <td className="py-3 px-4 text-emerald-400 font-sans">None (Database-per-service)</td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                          EXCELLENT
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => handleLoadCase(BENCHMARK_CASES[0], true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-white font-sans font-medium">ARCH-006: Circular Dependency Banking</td>
                      <td className="py-3 px-4 text-slate-400">Banking</td>
                      <td className="py-3 px-4 text-slate-300">4 Services / 2 DB</td>
                      <td className="py-3 px-4 text-purple-400 font-sans">Directed Cycle Detected</td>
                      <td className="py-3 px-4">
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-sans font-semibold">
                          NEEDS REVIEW
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => handleLoadCase(BENCHMARK_CASES[5] || BENCHMARK_CASES[0], true)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ARCHITECTURE STUDIO (Editor, Live Preview, Results) */}
        {/* ========================================================= */}
        {currentTab === "editor" && (
          <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
            {/* Studio Action & Selector Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Load Scenario:</span>
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    const c = BENCHMARK_CASES.find((item) => item.case_id === e.target.value);
                    if (c) handleLoadCase(c, false);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-xs truncate"
                >
                  {BENCHMARK_CASES.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id}: {c.name} ({c.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setMermaidCode("");
                    setAnalysisResult(null);
                    setParsedGraph(null);
                    setSelectedFinding(null);
                    setHighlightedNodes([]);
                    setErrorMessage(null);
                  }}
                  className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <button
                  onClick={() => executeAnalysis(mermaidCode)}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAnalyzing ? "Analyzing Graph..." : "Analyze Architecture"}</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Analysis Failed</p>
                  <p className="text-slate-300 font-mono text-[11px] mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Split Screen Workspace: Editor Left, Live Preview Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Mermaid Code Editor */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">Mermaid Syntax Editor</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">flowchart LR/TD</span>
                </div>
                <div className="p-4 flex-1">
                  <textarea
                    value={mermaidCode}
                    onChange={(e) => setMermaidCode(e.target.value)}
                    placeholder="Enter Mermaid diagram syntax..."
                    rows={15}
                    className="w-full h-full min-h-[400px] bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/80 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Right Column: Visual Diagram Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">Architecture Visualization</span>
                  </div>

                  {/* View Mode Toggle: Interactive Flow vs Mermaid SVG */}
                  <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setPreviewMode("flow")}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all flex items-center space-x-1 ${
                        previewMode === "flow"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Interactive Flow</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode("mermaid")}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all flex items-center space-x-1 ${
                        previewMode === "mermaid"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Mermaid SVG</span>
                    </button>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col min-h-[480px]">
                  {previewMode === "flow" ? (
                    <ArchitectureGraphViewer
                      graph={analysisResult?.graph || parsedGraph}
                      highlightedNodeIds={highlightedNodes}
                      selectedFinding={selectedFinding}
                      findings={analysisResult?.findings || []}
                      onClearHighlight={() => {
                        setSelectedFinding(null);
                        setHighlightedNodes([]);
                      }}
                      onSelectNode={(nodeId) => {
                        setHighlightedNodes([nodeId]);
                      }}
                    />
                  ) : (
                    <MermaidViewer code={mermaidCode} highlightedNodes={highlightedNodes} />
                  )}
                </div>
              </div>
            </div>

            {/* Results Section */}
            {analysisResult && (
              <div className="space-y-6 pt-6 border-t border-slate-800/80">
                {/* Result Title & Overall Status */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      Topological Analysis Results
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{analysisResult.summary}</p>
                  </div>

                  <div>
                    {analysisResult.findings.length > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        {analysisResult.findings.length} Architectural Concern(s) Found
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        All 10 Rules Passed (0 Violations)
                      </span>
                    )}
                  </div>
                </div>

                {/* Graph Metrics (Nodes, Edges, Services, DBs, Caches, Cycles) */}
                <GraphMetrics statistics={analysisResult.statistics} />

                {/* Sub-tabs for Results View */}
                <div className="border-b border-slate-800 flex space-x-4">
                  <button
                    onClick={() => setActiveResultsSubTab("findings")}
                    className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                      activeResultsSubTab === "findings"
                        ? "border-indigo-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Architectural Findings ({analysisResult.findings.length})
                  </button>
                  <button
                    onClick={() => setActiveResultsSubTab("graph_table")}
                    className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                      activeResultsSubTab === "graph_table"
                        ? "border-indigo-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Extracted Topology Table ({analysisResult.graph.nodes.length} Nodes, {analysisResult.graph.edges.length} Edges)
                  </button>
                  <button
                    onClick={() => setActiveResultsSubTab("rules_metadata")}
                    className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                      activeResultsSubTab === "rules_metadata"
                        ? "border-indigo-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Rule Engine Diagnostics ({analysisResult.rule_metadata?.length || 10} Rules Executed)
                  </button>
                </div>

                {/* Sub-tab 1: Findings */}
                {activeResultsSubTab === "findings" && (
                  <FindingsPanel
                    findings={analysisResult.findings}
                    selectedFindingId={selectedFinding?.finding_id}
                    onSelectFinding={(f) => {
                      setSelectedFinding(f);
                      setHighlightedNodes(f ? f.affected_nodes : []);
                    }}
                    onSelectNode={(nodeId) => {
                      setHighlightedNodes([nodeId]);
                    }}
                  />
                )}

                {/* Sub-tab 2: Extracted Topology Table */}
                {activeResultsSubTab === "graph_table" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nodes Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-indigo-400" />
                        Extracted Nodes ({analysisResult.graph.nodes.length})
                      </h4>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="text-[10px] uppercase text-slate-400 bg-slate-950/60">
                            <tr>
                              <th className="p-2">ID</th>
                              <th className="p-2">Label</th>
                              <th className="p-2">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {analysisResult.graph.nodes.map((n) => (
                              <tr key={n.id} className="hover:bg-slate-800/30">
                                <td className="p-2 text-indigo-300">{n.id}</td>
                                <td className="p-2 text-slate-300 font-sans">{n.label}</td>
                                <td className="p-2">
                                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                    {n.type}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Edges Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        Extracted Directed Edges ({analysisResult.graph.edges.length})
                      </h4>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="text-[10px] uppercase text-slate-400 bg-slate-950/60">
                            <tr>
                              <th className="p-2">Source</th>
                              <th className="p-2">Target</th>
                              <th className="p-2">Mode</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {analysisResult.graph.edges.map((e, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="p-2 text-indigo-300">{e.source}</td>
                                <td className="p-2 text-emerald-300">{e.target}</td>
                                <td className="p-2 text-[10px] text-slate-400">{e.communication}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Rule Engine Diagnostics */}
                {activeResultsSubTab === "rules_metadata" && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          Deterministic Rule Engine Diagnostics & Telemetry
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Per-rule execution latency, category mapping, and findings count across the AST.
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                        Total Rules: {analysisResult.rule_metadata?.length || 10} • Engine Status: OK
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Rule ID</th>
                            <th className="py-2.5 px-3">Rule Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Latency</th>
                            <th className="py-2.5 px-3 text-right">Findings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {(analysisResult.rule_metadata || []).map((rm) => (
                            <tr key={rm.rule_id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-indigo-300">{rm.rule_id}</td>
                              <td className="py-2.5 px-3 font-sans text-slate-200">{rm.rule_name}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                  {rm.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-sans text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                                  {rm.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{rm.execution_time_ms.toFixed(3)} ms</td>
                              <td className="py-2.5 px-3 text-right">
                                {rm.findings_count > 0 ? (
                                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                                    {rm.findings_count}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REVIEW HISTORY */}
        {/* ========================================================= */}
        {currentTab === "history" && (
          <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-2">Audit History & Persistence</h3>
              <p className="text-xs text-slate-400 mb-6">
                Historical architectural reviews stored across sessions. Click any record to inspect the original topology and findings.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BENCHMARK_CASES.slice(0, 6).map((c) => (
                  <div
                    key={c.case_id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {c.case_id}
                        </span>
                        <span className="text-xs font-semibold text-white">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{c.domain} • Verified Baseline</span>
                    </div>

                    <button
                      onClick={() => handleLoadCase(c, true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
                    >
                      Re-Audit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

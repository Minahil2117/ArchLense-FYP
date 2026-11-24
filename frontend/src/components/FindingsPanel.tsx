"use client";

import React, { useState, useMemo } from "react";
import { Finding } from "@/types/architecture";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  Search,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface FindingsPanelProps {
  findings: Finding[];
  selectedFindingId?: string | null;
  onSelectFinding?: (finding: Finding | null) => void;
  onSelectNode?: (nodeId: string) => void;
}

export function FindingsPanel({
  findings,
  selectedFindingId,
  onSelectFinding,
  onSelectNode,
}: FindingsPanelProps) {
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    findings.forEach((f) => {
      const sev = f.severity;
      if (sev in counts) {
        counts[sev as keyof typeof counts]++;
      }
    });
    return counts;
  }, [findings]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesCategory =
        selectedCategory === "All" || f.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSeverity =
        selectedSeverity === "All" || f.severity.toLowerCase() === selectedSeverity.toLowerCase();
      const matchesStatus =
        selectedStatus === "All" || f.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.affected_nodes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [findings, selectedCategory, selectedSeverity, selectedStatus, searchQuery]);

  const hasActiveFilters =
    selectedCategory !== "All" ||
    selectedSeverity !== "All" ||
    selectedStatus !== "All" ||
    searchQuery !== "";

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedSeverity("All");
    setSelectedStatus("All");
    setSearchQuery("");
  };

  const toggleEvidence = (findingId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  if (findings.length === 0) {
    return (
      <div className="p-8 bg-slate-900/60 border border-emerald-500/30 rounded-2xl text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-white">Clean Architecture Baseline</h4>
        <p className="text-xs text-slate-400 max-w-lg mt-1 leading-relaxed">
          Zero anti-patterns or architectural risks were detected by the deterministic rule engine (AP-01 through AP-12). All microservices conform to isolated boundaries and single-responsibility principles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Metrics Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        {/* Severity Metrics Summary Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              Findings Overview ({findings.length} total)
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {filteredFindings.length} showing
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium">
            <button
              onClick={() => setSelectedSeverity(selectedSeverity === "Critical" ? "All" : "Critical")}
              className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                selectedSeverity === "Critical"
                  ? "bg-rose-500 text-white border-rose-400"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
              }`}
            >
              {severityCounts.Critical} Critical
            </button>
            <button
              onClick={() => setSelectedSeverity(selectedSeverity === "High" ? "All" : "High")}
              className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                selectedSeverity === "High"
                  ? "bg-amber-500 text-white border-amber-400"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              {severityCounts.High} High
            </button>
            <button
              onClick={() => setSelectedSeverity(selectedSeverity === "Medium" ? "All" : "Medium")}
              className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                selectedSeverity === "Medium"
                  ? "bg-blue-500 text-white border-blue-400"
                  : "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
              }`}
            >
              {severityCounts.Medium} Medium
            </button>
            <button
              onClick={() => setSelectedSeverity(selectedSeverity === "Low" ? "All" : "Low")}
              className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                selectedSeverity === "Low"
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/60"
              }`}
            >
              {severityCounts.Low} Low
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings or nodes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Security">Security</option>
              <option value="Scalability">Scalability</option>
              <option value="Cost & Maintenance">Cost & Maintenance</option>
              <option value="Reliability">Reliability</option>
              <option value="Architecture">Architecture</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="potential">Potential</option>
              <option value="not_evidenced">Not Evidenced</option>
            </select>
          </div>

          {/* Severity Dropdown or Reset Button */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Reset Filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No Matches Found Fallback */}
      {filteredFindings.length === 0 && (
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl text-center">
          <p className="text-xs text-slate-400">No architectural findings match the selected filters.</p>
          <button
            onClick={resetFilters}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((f) => {
          const isSelected = selectedFindingId === f.finding_id;
          const isCritical = f.severity.toLowerCase() === "critical";
          const isHigh = f.severity.toLowerCase() === "high";
          const isMedium = f.severity.toLowerCase() === "medium";

          // Severity style
          const severityBadge = isCritical
            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
            : isHigh
            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
            : isMedium
            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
            : "bg-slate-700/30 text-slate-300 border-slate-700";

          // Category badge style & icon
          const categoryStyle =
            f.category === "Security"
              ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
              : f.category === "Scalability"
              ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
              : f.category === "Cost & Maintenance"
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-purple-400 bg-purple-500/10 border-purple-500/20";

          // Status badge style
          const statusBadge =
            f.status === "confirmed"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : f.status === "potential"
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-slate-800 text-slate-400 border-slate-700";

          const isEvidenceExpanded = !!expandedEvidence[f.finding_id];

          return (
            <div
              key={f.finding_id}
              onClick={() => {
                if (onSelectFinding) onSelectFinding(isSelected ? null : f);
              }}
              className={`p-5 bg-slate-900 border rounded-xl transition-all shadow-sm cursor-pointer ${
                isSelected
                  ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900/95"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Rule ID */}
                  <span className="text-[11px] font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {f.rule_id}
                  </span>

                  {/* Category */}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${categoryStyle}`}>
                    {f.category}
                  </span>

                  {/* Severity */}
                  <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded border ${severityBadge}`}>
                    {f.severity}
                  </span>

                  {/* Status */}
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${statusBadge}`}>
                    {f.status.replace("_", " ")}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500">{f.finding_id}</span>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                {isCritical ? (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                {f.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {f.description || f.summary}
              </p>

              {/* Affected Nodes Pills */}
              {f.affected_nodes && f.affected_nodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Affected Nodes:</span>
                  {f.affected_nodes.map((node) => (
                    <button
                      key={node}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectNode) onSelectNode(node);
                      }}
                      className="text-[11px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 px-2 py-0.5 rounded transition-colors"
                      title="Click to inspect component"
                    >
                      {node}
                    </button>
                  ))}
                </div>
              )}

              {/* Structured Evidence Block */}
              {f.evidence && Object.keys(f.evidence).length > 0 && (
                <div
                  className="bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 mb-3 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 font-medium text-[11px]">Empirical Graph Evidence:</span>
                    <button
                      onClick={() => toggleEvidence(f.finding_id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {isEvidenceExpanded ? (
                        <>Hide JSON <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Raw Details <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>

                  {/* Formatted Key-Value Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                    {Object.entries(f.evidence).map(([key, val]) => (
                      <div key={key} className="flex items-baseline space-x-1.5 truncate">
                        <span className="text-slate-500 shrink-0">{key.replace(/_/g, " ")}:</span>
                        <span className="text-slate-300 truncate">
                          {Array.isArray(val)
                            ? val.join(", ")
                            : typeof val === "object" && val !== null
                            ? JSON.stringify(val)
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Collapsible Raw JSON */}
                  {isEvidenceExpanded && (
                    <pre className="mt-2.5 p-2 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 font-mono overflow-x-auto">
                      {JSON.stringify(f.evidence, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Actionable Remediation */}
              <div className="flex items-start gap-2 text-xs bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-3 text-indigo-200">
                <ArrowRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-indigo-300">Actionable Remediation: </span>
                  <span className="leading-relaxed">{f.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

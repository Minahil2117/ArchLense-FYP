"use client";

import React from "react";
import {
  X,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ArchitectureNodeData, ArchitectureEdgeData } from "./types";
import { Finding } from "@/types/architecture";

interface NodeDetailsDrawerProps {
  selectedNode: ArchitectureNodeData | null;
  selectedEdge: ArchitectureEdgeData | null;
  findings: Finding[];
  incomingNodes: string[];
  outgoingNodes: string[];
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export function NodeDetailsDrawer({
  selectedNode,
  selectedEdge,
  findings,
  incomingNodes,
  outgoingNodes,
  onClose,
  onSelectNode,
}: NodeDetailsDrawerProps) {
  if (!selectedNode && !selectedEdge) return null;

  // Find findings affecting this node
  const relatedFindings = selectedNode
    ? findings.filter((f) =>
        f.affected_nodes.some(
          (n) => n.toLowerCase() === selectedNode.id.toLowerCase() || n.toLowerCase() === selectedNode.label.toLowerCase()
        )
      )
    : [];

  return (
    <div className="absolute right-4 top-16 bottom-4 w-80 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md flex flex-col z-30 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {selectedNode ? "Component Inspector" : "Relationship Inspector"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {selectedNode && (
          <>
            {/* Node Identification */}
            <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  {selectedNode.type.replace("_", " ")}
                </span>
                <span className="text-[10px] font-mono text-slate-400">id: {selectedNode.id}</span>
              </div>
              <h3 className="text-sm font-bold text-white break-words">{selectedNode.label}</h3>
            </div>

            {/* In / Out Degrees */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>In-Degree</span>
                </div>
                <span className="font-mono font-bold text-white">{selectedNode.inDegree}</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Out-Degree</span>
                </div>
                <span className="font-mono font-bold text-white">{selectedNode.outDegree}</span>
              </div>
            </div>

            {/* Related Findings */}
            {relatedFindings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Architectural Concerns ({relatedFindings.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {relatedFindings.map((rf) => (
                    <div
                      key={rf.finding_id}
                      className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-rose-300">
                          {rf.rule_id}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-rose-500/20 text-rose-200 rounded">
                          {rf.severity}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-tight">{rf.title}</p>
                      <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
                        {rf.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Dependencies */}
            <div className="space-y-3 pt-2">
              {/* Incoming Callers */}
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Direct Inbound Callers ({incomingNodes.length}):
                </span>
                {incomingNodes.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No inbound callers</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {incomingNodes.map((caller) => (
                      <button
                        key={caller}
                        onClick={() => onSelectNode && onSelectNode(caller)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 hover:border-indigo-400 transition-colors"
                      >
                        {caller}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Targets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Direct Downstream Dependencies ({outgoingNodes.length}):
                </span>
                {outgoingNodes.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No downstream dependencies</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {outgoingNodes.map((target) => (
                      <button
                        key={target}
                        onClick={() => onSelectNode && onSelectNode(target)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 hover:border-emerald-400 transition-colors"
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedEdge && (
          <div className="space-y-3">
            <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                {selectedEdge.communication.replace("_", " ")}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-white text-xs pt-1">
                <span className="text-indigo-300">{selectedEdge.source}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-emerald-300">{selectedEdge.target}</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Communication Mode:</span>
                <span className="text-white font-sans capitalize">{selectedEdge.communication.replace("_", " ")}</span>
              </div>
              {selectedEdge.protocol && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Protocol:</span>
                  <span className="text-white">{selectedEdge.protocol}</span>
                </div>
              )}
              {selectedEdge.label && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Edge Label:</span>
                  <span className="text-white">{selectedEdge.label}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">Click canvas to deselect</span>
        <button
          onClick={onClose}
          className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

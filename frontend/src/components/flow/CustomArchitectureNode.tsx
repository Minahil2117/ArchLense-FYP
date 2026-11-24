"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Server,
  Database,
  Zap,
  Shield,
  Layers,
  Smartphone,
  Cloud,
  Share2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { NodeType } from "@/types/architecture";
import { CustomNodeType } from "./types";

interface NodeVisualConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  borderColor: string;
  headerBg: string;
  badgeBg: string;
  textColor: string;
  accentDot: string;
}

function getNodeConfig(type: NodeType): NodeVisualConfig {
  switch (type) {
    case "api_gateway":
      return {
        label: "API Gateway",
        icon: Shield,
        borderColor: "border-purple-500/50 hover:border-purple-400",
        headerBg: "bg-purple-950/40",
        badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        textColor: "text-purple-300",
        accentDot: "bg-purple-400",
      };
    case "database":
      return {
        label: "Database",
        icon: Database,
        borderColor: "border-emerald-500/50 hover:border-emerald-400",
        headerBg: "bg-emerald-950/40",
        badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        textColor: "text-emerald-300",
        accentDot: "bg-emerald-400",
      };
    case "cache":
      return {
        label: "Cache",
        icon: Zap,
        borderColor: "border-amber-500/50 hover:border-amber-400",
        headerBg: "bg-amber-950/40",
        badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        textColor: "text-amber-300",
        accentDot: "bg-amber-400",
      };
    case "message_broker":
      return {
        label: "Message Broker",
        icon: Layers,
        borderColor: "border-cyan-500/50 hover:border-cyan-400",
        headerBg: "bg-cyan-950/40",
        badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        textColor: "text-cyan-300",
        accentDot: "bg-cyan-400",
      };
    case "client":
      return {
        label: "Client Ingress",
        icon: Smartphone,
        borderColor: "border-sky-500/50 hover:border-sky-400",
        headerBg: "bg-sky-950/40",
        badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        textColor: "text-sky-300",
        accentDot: "bg-sky-400",
      };
    case "external_service":
      return {
        label: "External Service",
        icon: Cloud,
        borderColor: "border-rose-500/50 hover:border-rose-400",
        headerBg: "bg-rose-950/40",
        badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        textColor: "text-rose-300",
        accentDot: "bg-rose-400",
      };
    case "load_balancer":
      return {
        label: "Load Balancer",
        icon: Share2,
        borderColor: "border-blue-500/50 hover:border-blue-400",
        headerBg: "bg-blue-950/40",
        badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        textColor: "text-blue-300",
        accentDot: "bg-blue-400",
      };
    case "service":
    default:
      return {
        label: "Microservice",
        icon: Server,
        borderColor: "border-indigo-500/50 hover:border-indigo-400",
        headerBg: "bg-indigo-950/40",
        badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        textColor: "text-indigo-300",
        accentDot: "bg-indigo-400",
      };
  }
}

export const CustomArchitectureNode = memo(function CustomArchitectureNode({
  data,
  selected,
}: NodeProps<CustomNodeType>) {
  const config = getNodeConfig(data.type);
  const Icon = config.icon;

  const isHighlighted = data.highlightState === "highlighted";
  const isDimmed = data.highlightState === "dimmed";
  const isSelected = selected || data.isSelected;

  // Dynamic styling based on highlight / selection
  let containerStyles = "bg-slate-900 border-slate-800 text-slate-100 shadow-sm";
  if (isHighlighted) {
    containerStyles =
      "bg-slate-900/95 border-rose-500 ring-2 ring-rose-500/80 shadow-[0_0_22px_rgba(244,63,94,0.5)]";
  } else if (isSelected) {
    containerStyles =
      "bg-slate-900 border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_0_15px_rgba(99,102,241,0.3)]";
  } else {
    containerStyles = `bg-slate-900/90 ${config.borderColor} shadow-sm`;
  }

  const opacityClass = isDimmed ? "opacity-35 grayscale-[30%] transition-opacity" : "opacity-100 transition-opacity";

  return (
    <div
      className={`relative rounded-xl border p-3 min-w-[200px] max-w-[260px] backdrop-blur-md transition-all cursor-grab active:cursor-grabbing ${containerStyles} ${opacityClass}`}
    >
      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="w-2.5 h-2.5 !bg-indigo-400 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="w-2.5 h-2.5 !bg-indigo-400 !border-slate-900"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="w-2.5 h-2.5 !bg-indigo-400 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="w-2.5 h-2.5 !bg-indigo-400 !border-slate-900"
      />

      {/* Affected Warning Banner */}
      {isHighlighted && (
        <div className="absolute -top-3 left-3 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-md uppercase">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>Affected Component</span>
        </div>
      )}

      {/* Node Header: Type badge & In/Out degree */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1 ${config.badgeBg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.accentDot}`} />
          {config.label}
        </span>

        {/* Degree telemetry */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400" title={`In-degree: ${data.inDegree}, Out-degree: ${data.outDegree}`}>
          <span className="flex items-center">
            <ArrowDownRight className="w-3 h-3 text-emerald-400 inline" />
            {data.inDegree}
          </span>
          <span className="flex items-center">
            <ArrowUpRight className="w-3 h-3 text-indigo-400 inline" />
            {data.outDegree}
          </span>
        </div>
      </div>

      {/* Main Component Title & Icon */}
      <div className="flex items-start gap-2.5">
        <div className={`p-2 rounded-lg ${config.headerBg} border border-slate-800 shrink-0`}>
          <Icon className={`w-4 h-4 ${config.textColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className="text-xs font-bold text-white leading-tight truncate"
            title={data.label}
          >
            {data.label}
          </h4>
          <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={data.id}>
            id: {data.id}
          </p>
        </div>
      </div>

      {/* Rule Flags if any */}
      {data.findingLabels && data.findingLabels.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap gap-1">
          {data.findingLabels.map((lbl) => (
            <span
              key={lbl}
              className="text-[9px] font-mono px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded"
            >
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

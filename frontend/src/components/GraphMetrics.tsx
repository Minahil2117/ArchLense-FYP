"use client";

import React from "react";
import { GraphStatistics } from "@/types/architecture";
import { Server, Database, Zap, Layers, Share2, Repeat, ShieldCheck } from "lucide-react";

interface GraphMetricsProps {
  statistics: GraphStatistics;
}

export function GraphMetrics({ statistics }: GraphMetricsProps) {
  const cards = [
    { label: "Total Nodes", value: statistics.total_nodes, icon: Layers, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Connections", value: statistics.total_edges, icon: Share2, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
    { label: "Microservices", value: statistics.service_count, icon: Server, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Databases", value: statistics.database_count, icon: Database, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Caches", value: statistics.cache_count, icon: Zap, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { label: "Event Brokers", value: statistics.broker_count, icon: ShieldCheck, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
    {
      label: "Directed Cycles",
      value: statistics.cycle_count,
      icon: Repeat,
      color: statistics.cycle_count > 0 ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-slate-400 bg-slate-800/40 border-slate-700/50"
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-3 rounded-xl border flex flex-col justify-between ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">{card.label}</span>
              <Icon className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-white">
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

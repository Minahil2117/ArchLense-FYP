"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { CustomEdgeType } from "./types";

export const CustomArchitectureEdge = memo(function CustomArchitectureEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<CustomEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = data?.highlightState === "highlighted";
  const isDimmed = data?.highlightState === "dimmed";
  const commType = data?.communication || "sync_http";

  // Label to display
  let badgeText = data?.label || "";
  if (!badgeText) {
    if (commType === "async_message") badgeText = "async";
    else if (commType === "database_access") badgeText = "db";
    else if (commType === "grpc") badgeText = "gRPC";
    else if (commType === "sync_http") badgeText = "HTTP";
  }

  // Label badge styling
  let badgeStyle = "bg-slate-900 border-slate-700 text-slate-300";
  if (isHighlighted) {
    badgeStyle = "bg-rose-950 border-rose-500 text-rose-200 ring-1 ring-rose-500";
  } else if (commType === "async_message") {
    badgeStyle = "bg-cyan-950/80 border-cyan-500/40 text-cyan-300";
  } else if (commType === "database_access") {
    badgeStyle = "bg-emerald-950/80 border-emerald-500/40 text-emerald-300";
  }

  // Opacity for dimmed edges
  const containerOpacity = isDimmed ? "opacity-25" : "opacity-100";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHighlighted ? 3 : selected ? 2.5 : 1.8,
        }}
      />
      {badgeText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={`px-2 py-0.5 rounded-full border text-[9px] font-mono tracking-tight font-medium shadow-sm transition-all select-none ${badgeStyle} ${containerOpacity}`}
            title={`Communication: ${commType}${data?.protocol ? ` (${data.protocol})` : ""}`}
          >
            {badgeText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidViewerProps {
  code: string;
  highlightedNodes?: string[];
}

export function MermaidViewer({ code, highlightedNodes = [] }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      if (!code || !code.trim()) {
        setSvgContent("");
        setRenderError("Empty diagram source.");
        return;
      }

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          fontFamily: "Inter, ui-sans-serif, system-ui",
          flowchart: {
            curve: "basis",
            htmlLabels: true,
          },
        });

        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);

        if (isMounted) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          setRenderError(message);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code]);

  // Apply node highlighting dynamically to SVG elements
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    // Reset previous highlights
    const allSvgNodes = containerRef.current.querySelectorAll(".node");
    allSvgNodes.forEach((node) => {
      const el = node as HTMLElement;
      el.style.removeProperty("filter");
      const shape = el.querySelector("rect, circle, polygon, path") as HTMLElement | null;
      if (shape) {
        shape.style.removeProperty("stroke");
        shape.style.removeProperty("stroke-width");
      }
    });

    if (!highlightedNodes || highlightedNodes.length === 0) return;

    // Normalize highlighted node IDs to lowercase
    const normalizedTargets = highlightedNodes.map((n) => n.toLowerCase().trim());

    allSvgNodes.forEach((node) => {
      const el = node as HTMLElement;
      const nodeId = (el.id || "").toLowerCase();
      const nodeText = (el.textContent || "").toLowerCase();

      const isMatch = normalizedTargets.some(
        (target) =>
          nodeId.includes(`flowchart-${target}-`) ||
          nodeId === target ||
          nodeText.includes(target)
      );

      if (isMatch) {
        el.style.filter = "drop-shadow(0 0 8px rgba(244, 63, 94, 0.75))";
        const shape = el.querySelector("rect, circle, polygon, path") as HTMLElement | null;
        if (shape) {
          shape.style.stroke = "#f43f5e";
          shape.style.strokeWidth = "3px";
        }
      }
    });
  }, [svgContent, highlightedNodes]);

  return (
    <div className="w-full h-full min-h-[380px] bg-slate-950/40 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center overflow-auto relative">
      {renderError ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs max-w-md text-center">
          <p className="font-semibold mb-1">Diagram Preview Warning</p>
          <p className="text-slate-400 font-mono text-[11px] break-words">{renderError}</p>
        </div>
      ) : svgContent ? (
        <div
          ref={containerRef}
          className="w-full h-full flex justify-center items-center [&>svg]:max-w-full [&>svg]:h-auto transition-all"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="text-slate-400 text-xs">Enter Mermaid syntax to preview architecture</div>
      )}
    </div>
  );
}

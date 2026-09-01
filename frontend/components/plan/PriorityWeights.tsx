"use client";

import { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import type { PriorityWeights as Weights } from "@/lib/types";

const DEFAULTS: Weights = {
  confidence: 0.3,
  entanglement: 0.28,
  reef: 0.18,
  access: 0.16,
  cluster: 0.08,
};

const ROWS: { key: keyof Weights; label: string; hint: string }[] = [
  { key: "confidence", label: "Confidence", hint: "calibrated evidence" },
  { key: "entanglement", label: "Entanglement risk", hint: "gillnet > drum > pipe" },
  { key: "reef", label: "Reef proximity", hint: "GEBCO + MPA polygons" },
  { key: "access", label: "Diver accessibility", hint: "peaks 12–30 m" },
  { key: "cluster", label: "Cluster density", hint: "ST_ClusterDBSCAN" },
];

// Operator-tunable weights (report §6.3) — drag to re-rank the dive plan live.
export function PriorityWeights({ onChange }: { onChange: (w: Weights) => void }) {
  const [w, setW] = useState<Weights>(DEFAULTS);

  function set(key: keyof Weights, value: number) {
    const next = { ...w, [key]: value };
    setW(next);
    onChange(next);
  }

  function reset() {
    setW(DEFAULTS);
    onChange(DEFAULTS);
  }

  return (
    <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white">
          <SlidersHorizontal className="h-4 w-4 text-teal-400" />
          Priority weights
        </h2>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[11px] text-[#8aa6bb] hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> reset
        </button>
      </div>

      <div className="space-y-4">
        {ROWS.map(({ key, label, hint }) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#cde3ef]">{label}</span>
              <span className="mono text-teal-300">{w[key].toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={w[key]}
              onChange={(e) => set(key, parseFloat(e.target.value))}
              className="mt-1.5 w-full accent-teal-400"
            />
            <div className="text-[10px] text-[#6b8299]">{hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

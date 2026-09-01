"use client";

import { useEffect, useState } from "react";
import { fetchMetrics } from "@/lib/api";
import type { Metrics } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/stages";
import { StatCard } from "@/components/dashboard/StatCard";

export default function MetricsPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMetrics().then(setM).catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-coral-500">
        Backend unreachable — start the API on :8000.
      </div>
    );
  }
  if (!m) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[#6b8299]">
        loading metrics…
      </div>
    );
  }

  const maxLatency = Math.max(...m.stage_latency.map((s) => s.ms));
  const maxFa = Math.max(...m.ablation.map((a) => a.false_alarms_per_km2));

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="False alarms / km²" value={m.false_alarms_per_km2} sub="headline metric" accent="#ff5470" />
        <StatCard label="Recall" value={`${Math.round(m.recall * 100)}%`} accent="#4ade80" />
        <StatCard label="Localisation err" value={`${m.localisation_error_m} m`} accent="#60a5fa" />
        <StatCard label="Multi-ping confirmed" value={`${Math.round(m.pct_confirmed_multi_ping * 100)}%`} accent="#a78bfa" />
        <StatCard label="Surveyed" value={`${m.surveyed_km2} km²`} accent="#2dd4bf" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ablation ladder */}
        <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5 lg:col-span-2">
          <h2 className="mb-1 text-sm font-medium text-white">Ablation ladder</h2>
          <p className="mb-4 text-[11px] text-[#6b8299]">
            False alarms / km² fall monotonically as each contribution is added (report §11.3).
          </p>
          <div className="space-y-1.5">
            {m.ablation.map((a) => (
              <div key={a.step} className="flex items-center gap-3">
                <span className="mono w-5 shrink-0 text-right text-[10px] text-[#6b8299]">{a.step}</span>
                <span className="w-56 shrink-0 truncate text-[11px] text-[#cde3ef]">{a.config}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-ocean-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500/70 to-teal-400/70"
                    style={{ width: `${(a.false_alarms_per_km2 / maxFa) * 100}%` }}
                  />
                </div>
                <span className="mono w-12 shrink-0 text-right text-[10px] text-rose-300">{a.false_alarms_per_km2}</span>
                <span className="mono w-14 shrink-0 text-right text-[10px] text-emerald-300">
                  R{a.recall.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Calibration reliability diagram */}
        <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5">
          <h2 className="mb-1 text-sm font-medium text-white">Calibration</h2>
          <p className="mb-3 text-[11px] text-[#6b8299]">Reliability diagram — confidence vs. confirmed accuracy.</p>
          <svg viewBox="0 0 200 200" className="w-full">
            <rect x={20} y={0} width={180} height={180} fill="#081824" />
            {/* y = x reference */}
            <line x1={20} y1={180} x2={200} y2={0} stroke="#2c4a5e" strokeDasharray="4 3" strokeWidth={1} />
            {/* axes */}
            <line x1={20} y1={0} x2={20} y2={180} stroke="#1c3547" strokeWidth={1} />
            <line x1={20} y1={180} x2={200} y2={180} stroke="#1c3547" strokeWidth={1} />
            {/* calibration polyline */}
            <polyline
              fill="none"
              stroke="#2dd4bf"
              strokeWidth={2}
              points={m.calibration
                .map((b) => `${20 + b.confidence * 180},${180 - b.accuracy * 180}`)
                .join(" ")}
            />
            {m.calibration.map((b) => (
              <circle key={b.confidence} cx={20 + b.confidence * 180} cy={180 - b.accuracy * 180} r={3} fill="#5eead4" />
            ))}
          </svg>
          <div className="mono mt-1 flex justify-between text-[9px] text-[#6b8299]">
            <span>0.0</span>
            <span>confidence →</span>
            <span>1.0</span>
          </div>
        </div>

        {/* Per-stage latency */}
        <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5">
          <h2 className="mb-1 text-sm font-medium text-white">Per-stage latency</h2>
          <p className="mb-3 text-[11px] text-[#6b8299]">Answers &quot;will this run onboard?&quot; (report §4.9).</p>
          <div className="space-y-1.5">
            {m.stage_latency.map((s) => (
              <div key={s.stage} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-[10px] text-[#cde3ef]">{STAGE_LABEL[s.stage]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ocean-800">
                  <div className="h-full rounded-full bg-blue-400/70" style={{ width: `${(s.ms / maxLatency) * 100}%` }} />
                </div>
                <span className="mono w-12 shrink-0 text-right text-[10px] text-[#8aa6bb]">{s.ms} ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

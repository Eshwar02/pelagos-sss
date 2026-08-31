"use client";

import { fetchStats, fetchTargets } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClassBreakdown } from "@/components/dashboard/ClassBreakdown";
import { TargetTable } from "@/components/dashboard/TargetTable";

export default function DashboardPage() {
  const stats = useAsync(fetchStats);
  const targets = useAsync(() => fetchTargets());

  if (stats.error || targets.error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-coral-500">Backend unreachable.</p>
          <p className="mt-1 text-xs text-[#6b8299]">
            Start it: <span className="mono">cd backend &amp;&amp; uv run uvicorn app.main:app --port 8000</span>
          </p>
        </div>
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Targets" value={s?.total ?? "—"} sub={s ? `${s.confirmed} confirmed` : ""} />
        <StatCard
          label="Needs review"
          value={s?.review ?? "—"}
          sub="open-set anomalies"
          accent="#f472b6"
        />
        <StatCard
          label="High priority"
          value={s?.high_priority ?? "—"}
          sub="≥ 0.70"
          accent="#ff5470"
        />
        <StatCard
          label="Mean confidence"
          value={s ? `${Math.round(s.mean_confidence * 100)}%` : "—"}
          accent="#fbbf24"
        />
        <StatCard
          label="False alarms / km²"
          value={s?.false_alarms_per_km2 ?? "—"}
          sub={s ? `${s.surveyed_km2} km² surveyed` : ""}
        />
      </div>

      {/* Breakdown + region note */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {s ? (
            <ClassBreakdown items={s.by_class} />
          ) : (
            <div className="h-48 animate-pulse rounded-xl border border-ocean-800 bg-ocean-900" />
          )}
        </div>
        <div className="lg:col-span-2">
          {targets.data ? (
            <TargetTable targets={targets.data} />
          ) : (
            <div className="h-96 animate-pulse rounded-xl border border-ocean-800 bg-ocean-900" />
          )}
        </div>
      </div>
    </div>
  );
}

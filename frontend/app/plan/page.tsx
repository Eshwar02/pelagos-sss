"use client";

import { useEffect, useRef, useState } from "react";
import { fetchSurveys, fetchTargets, prioritise } from "@/lib/api";
import type { PriorityWeights as Weights, Survey, Target } from "@/lib/types";
import { TargetTable } from "@/components/dashboard/TargetTable";
import { TargetDetail } from "@/components/detail/TargetDetail";
import { PriorityWeights } from "@/components/plan/PriorityWeights";
import { ExportBar } from "@/components/plan/ExportBar";

export default function PlanPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selected, setSelected] = useState<Target | null>(null);
  const [error, setError] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([fetchTargets(), fetchSurveys()])
      .then(([t, s]) => {
        setTargets(t);
        setSurveys(s);
      })
      .catch(() => setError(true));
  }, []);

  function onWeights(w: Weights) {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      prioritise(w).then(setTargets).catch(() => setError(true));
    }, 120);
  }

  function applyReview(updated: Target) {
    setTargets((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
    setSelected((s) => (s && s.id === updated.id ? updated : s));
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-coral-500">
        Backend unreachable — start the API on :8000.
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <PriorityWeights onChange={onWeights} />
          {surveys.length > 0 && <ExportBar surveys={surveys} />}
          <p className="px-1 text-[11px] leading-relaxed text-[#6b8299]">
            Drag a weight and the ranking reorders live — the difference between a
            computer-vision demo and an operational dive plan.
          </p>
        </div>
        <div className="lg:col-span-2">
          {targets.length ? (
            <TargetTable targets={targets} onSelect={setSelected} selectedId={selected?.id} />
          ) : (
            <div className="h-96 animate-pulse rounded-xl border border-ocean-800 bg-ocean-900" />
          )}
        </div>
      </div>

      {selected && (
        <TargetDetail
          target={selected}
          onClose={() => setSelected(null)}
          onReviewed={applyReview}
          onSelect={setSelected}
        />
      )}
    </div>
  );
}

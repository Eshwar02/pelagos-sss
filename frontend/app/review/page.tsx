"use client";

import { useEffect, useState } from "react";
import { ScanEye } from "lucide-react";
import { fetchReviewQueue } from "@/lib/api";
import type { Target } from "@/lib/types";
import { CLASS_HEX, CLASS_LABEL, STATUS_HEX, STATUS_LABEL, priorityHex } from "@/lib/palette";
import { pct, meters } from "@/lib/format";
import { Chip } from "@/components/common/Chip";
import { EvidenceBar } from "@/components/common/EvidenceBar";
import { TargetDetail } from "@/components/detail/TargetDetail";

export default function ReviewPage() {
  const [queue, setQueue] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Target | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchReviewQueue().then(setQueue).catch(() => setError(true));
  }, []);

  function applyReview(updated: Target) {
    // Confirmed/rejected items drop out of the uncertainty queue.
    setQueue((q) =>
      updated.status === "rejected" ? q.filter((t) => t.id !== updated.id) : q.map((t) => (t.id === updated.id ? updated : t)),
    );
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
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-2">
          <ScanEye className="h-5 w-5 text-teal-400" />
          <div>
            <h2 className="text-sm font-medium text-white">Active-learning review queue</h2>
            <p className="text-[11px] text-[#6b8299]">
              Ranked by predictive uncertainty — the most informative labels first.
            </p>
          </div>
          <span className="mono ml-auto text-xs text-[#8aa6bb]">{queue.length} pending</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`rounded-xl border bg-ocean-900 p-4 text-left transition-colors hover:border-teal-400/40 ${
                selected?.id === t.id ? "border-teal-400/60" : "border-ocean-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-xs text-[#cde3ef]">
                  <span className="text-[#6b8299]">#{i + 1}</span> {t.id}
                </span>
                <span
                  className="mono rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ color: priorityHex(t.priority), backgroundColor: `${priorityHex(t.priority)}1a` }}
                >
                  p{t.priority.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip label={CLASS_LABEL[t.class]} color={CLASS_HEX[t.class]} />
                <Chip label={STATUS_LABEL[t.status]} color={STATUS_HEX[t.status]} />
              </div>
              <div className="mt-3">
                <EvidenceBar evidence={t.evidence} />
              </div>
              <div className="mono mt-2 flex justify-between text-[10px] text-[#6b8299]">
                <span>conf {pct(t.confidence)}</span>
                <span>novelty {pct(t.evidence.open_set_novelty)}</span>
                <span>{meters(t.depth_m)}</span>
              </div>
            </button>
          ))}
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

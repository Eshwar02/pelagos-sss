"use client";

import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import type { SimilarTarget, Target } from "@/lib/types";
import { CLASS_HEX, CLASS_LABEL, STATUS_HEX, STATUS_LABEL, priorityHex } from "@/lib/palette";
import { meters, pct, priorityBand, relTime } from "@/lib/format";
import { Chip } from "@/components/common/Chip";
import { EvidenceBar } from "@/components/common/EvidenceBar";
import { fetchSimilar } from "@/lib/api";
import { WaterfallPanel } from "./WaterfallPanel";
import { ReviewActions } from "./ReviewActions";

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ocean-800/50 py-1.5 text-xs">
      <span className="text-[#6b8299]">{k}</span>
      <span className="mono text-[#cde3ef]">{v}</span>
    </div>
  );
}

// Slide-over detail panel: the moment that wins the round (report demo script).
export function TargetDetail({
  target,
  onClose,
  onReviewed,
  onSelect,
}: {
  target: Target;
  onClose: () => void;
  onReviewed?: (t: Target) => void;
  onSelect?: (t: Target) => void;
}) {
  const [similar, setSimilar] = useState<SimilarTarget[] | null>(null);

  useEffect(() => {
    let alive = true;
    setSimilar(null);
    fetchSimilar(target.id)
      .then((s) => alive && setSimilar(s))
      .catch(() => alive && setSimilar([]));
    return () => {
      alive = false;
    };
  }, [target.id]);

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[400px] max-w-full flex-col border-l border-ocean-800 bg-ocean-900 shadow-2xl">
      {/* header */}
      <div className="flex items-start justify-between border-b border-ocean-800 px-5 py-4">
        <div>
          <div className="mono text-sm text-[#cde3ef]">{target.id}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip label={CLASS_LABEL[target.class]} color={CLASS_HEX[target.class]} />
            <Chip label={STATUS_LABEL[target.status]} color={STATUS_HEX[target.status]} />
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-[#8aa6bb] hover:bg-ocean-800 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* priority + confidence headline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ocean-800 bg-ocean-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#6b8299]">Priority</div>
            <div className="mt-1 text-xl font-semibold" style={{ color: priorityHex(target.priority) }}>
              {target.priority.toFixed(2)}
              <span className="ml-1 text-[11px] font-normal">{priorityBand(target.priority)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-ocean-800 bg-ocean-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#6b8299]">Confidence</div>
            <div className="mt-1 text-xl font-semibold text-teal-300">{pct(target.confidence)}</div>
          </div>
        </div>

        <WaterfallPanel target={target} />

        {/* evidence provenance */}
        <div>
          <h3 className="mb-2 text-xs font-medium text-white">Evidence provenance</h3>
          <EvidenceBar evidence={target.evidence} showLegend />
        </div>

        {/* review loop */}
        <div>
          <h3 className="mb-2 text-xs font-medium text-white">Operator review</h3>
          <ReviewActions target={target} onReviewed={onReviewed} />
        </div>

        {/* geometry + provenance */}
        <div>
          <h3 className="mb-1 text-xs font-medium text-white">Object</h3>
          <Field k="Depth" v={meters(target.depth_m)} />
          <Field k="Length × width" v={`${target.length_m} × ${target.width_m} m`} />
          <Field k="Position" v={`${target.lat.toFixed(4)}, ${target.lon.toFixed(4)}`} />
          <Field k="Observations" v={`${target.n_observations} pings`} />
          <Field k="Ping range" v={`${target.first_ping}–${target.last_ping}`} />
          <Field k="Survey" v={target.survey_id} />
          <Field k="Detected" v={relTime(target.detected_at)} />
        </div>

        {/* priority factors */}
        <div>
          <h3 className="mb-1 text-xs font-medium text-white">Priority factors</h3>
          <Field k="Entanglement risk" v={pct(target.entanglement_risk)} />
          <Field k="Reef proximity" v={meters(target.reef_proximity_m)} />
          <Field k="Diver accessibility" v={pct(target.diver_accessibility)} />
          <Field k="Cluster density" v={pct(target.cluster_density)} />
        </div>

        {/* similar targets */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white">
            <Search className="h-3.5 w-3.5 text-teal-400" />
            Find everything that looks like this
          </h3>
          {similar === null ? (
            <div className="h-20 animate-pulse rounded-lg bg-ocean-950" />
          ) : similar.length === 0 ? (
            <div className="text-[11px] text-[#6b8299]">No neighbours.</div>
          ) : (
            <div className="space-y-1">
              {similar.map(({ target: t, similarity }) => (
                <button
                  key={t.id}
                  onClick={() => onSelect?.(t)}
                  className="flex w-full items-center justify-between rounded-md border border-ocean-800 bg-ocean-950 px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-ocean-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CLASS_HEX[t.class] }} />
                    <span className="mono text-[#cde3ef]">{t.id}</span>
                    <span className="text-[#8aa6bb]">{CLASS_LABEL[t.class]}</span>
                  </span>
                  <span className="mono text-teal-300">{Math.round(similarity * 100)}%</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

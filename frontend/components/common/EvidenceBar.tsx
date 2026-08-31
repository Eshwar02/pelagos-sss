import type { EvidenceVector } from "@/lib/types";

// The decomposed, auditable confidence — GhostNetZero shows a black-box score;
// we show *why*. Six named evidence sources as a normalised stacked bar.
const SOURCES: { key: keyof EvidenceVector; label: string; color: string }[] = [
  { key: "detector", label: "Detector", color: "#2dd4bf" },
  { key: "shadow_geometry", label: "Shadow geometry", color: "#60a5fa" },
  { key: "ping_persistence", label: "Ping persistence", color: "#a78bfa" },
  { key: "artificiality", label: "Artificiality", color: "#fbbf24" },
  { key: "bathymetry_plausibility", label: "Bathymetry", color: "#34d399" },
  { key: "open_set_novelty", label: "Novelty", color: "#ff5470" },
];

export function EvidenceBar({
  evidence,
  showLegend = false,
}: {
  evidence: EvidenceVector;
  showLegend?: boolean;
}) {
  const total = SOURCES.reduce((s, { key }) => s + evidence[key], 0) || 1;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-ocean-800">
        {SOURCES.map(({ key, label, color }) => (
          <div
            key={key}
            title={`${label}: ${evidence[key].toFixed(2)}`}
            style={{ width: `${(evidence[key] / total) * 100}%`, backgroundColor: color }}
          />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          {SOURCES.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
              <span className="flex-1 text-[#8aa6bb]">{label}</span>
              <span className="mono text-[#cde3ef]">{evidence[key].toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

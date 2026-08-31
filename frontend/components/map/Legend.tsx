import { CLASS_HEX, CLASS_LABEL } from "@/lib/palette";
import type { ObjectClass } from "@/lib/types";

const PRIORITY_STOPS = [
  { label: "critical ≥ 0.75", color: "#ff3b30" },
  { label: "high ≥ 0.60", color: "#ff8c42" },
  { label: "medium ≥ 0.45", color: "#ffd166" },
  { label: "low", color: "#4cc9f0" },
];

export function Legend({ mode }: { mode: "class" | "priority" }) {
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-ocean-800 bg-ocean-900/85 p-3 backdrop-blur">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-[#6b8299]">
        {mode === "class" ? "Debris class" : "Cleanup priority"}
      </div>
      <div className="space-y-1.5">
        {mode === "class"
          ? (Object.keys(CLASS_LABEL) as ObjectClass[]).map((c) => (
              <Row key={c} color={CLASS_HEX[c]} label={CLASS_LABEL[c]} />
            ))
          : PRIORITY_STOPS.map((p) => <Row key={p.label} color={p.color} label={p.label} />)}
      </div>
    </div>
  );
}

function Row({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#cde3ef]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

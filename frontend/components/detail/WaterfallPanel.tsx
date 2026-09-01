import type { Target } from "@/lib/types";

// Schematic stand-in for the OpenSeadragon waterfall viewer (report §4.8). The
// app-only build ships no real sonar raster, so this renders the *viewer UX* —
// the down-range column, the detection mask box, and the down-range acoustic
// shadow the Nizhal physics check reasons about — as an honest schematic.
export function WaterfallPanel({ target }: { target: Target }) {
  // Deterministic box placement from the target id so it feels stable.
  const seed = [...target.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const top = 26 + (seed % 30);
  const left = 30 + (seed % 22);
  const shadowConsistent = target.evidence.shadow_geometry >= 0.75;

  return (
    <div className="overflow-hidden rounded-lg border border-ocean-800 bg-ocean-950">
      <div className="flex items-center justify-between border-b border-ocean-800 px-3 py-1.5">
        <span className="text-[11px] font-medium text-[#cde3ef]">Waterfall · down-range column</span>
        <span className="mono text-[9px] uppercase tracking-wide text-[#6b8299]">schematic</span>
      </div>
      <div
        className="relative h-44 w-full"
        style={{
          background:
            "repeating-linear-gradient(180deg,#0a1e2c 0px,#0a1e2c 2px,#0c2434 3px,#081824 5px)",
        }}
      >
        {/* nadir line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-teal-400/25" />
        {/* detection mask box */}
        <div
          className="absolute rounded-sm border-2"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: "22%",
            height: "16%",
            borderColor: "#2dd4bf",
            boxShadow: "0 0 12px #2dd4bf55",
          }}
        >
          <span className="mono absolute -top-4 left-0 whitespace-nowrap text-[8px] text-teal-300">
            {target.id} · det {target.evidence.detector.toFixed(2)}
          </span>
        </div>
        {/* acoustic shadow, cast down-range from the object */}
        <div
          className="absolute"
          style={{
            top: `${top + 16}%`,
            left: `${left}%`,
            width: "22%",
            height: "20%",
            background: shadowConsistent
              ? "linear-gradient(180deg,#000000cc,transparent)"
              : "linear-gradient(180deg,#ff547066,transparent)",
          }}
        >
          <span
            className="mono absolute bottom-0 left-0 whitespace-nowrap text-[8px]"
            style={{ color: shadowConsistent ? "#8aa6bb" : "#ff5470" }}
          >
            shadow {shadowConsistent ? "consistent" : "inconsistent"}
          </span>
        </div>
      </div>
    </div>
  );
}

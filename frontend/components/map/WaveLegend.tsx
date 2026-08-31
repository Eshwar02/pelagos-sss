// Significant-wave-height legend for the animated water field. The gradient
// mirrors the water shader's calm->rough palette.
const GRAD = "linear-gradient(90deg,#123048 0%,#1c4a6e 35%,#2a6f97 65%,#3b93b8 85%,#bfe3f2 100%)";
const TICKS = ["0.8", "1.2", "1.6", "2.0+"];

export function WaveLegend({ meanHs }: { meanHs: number }) {
  const lo = 0.8;
  const hi = 2.2;
  const pos = Math.max(0, Math.min(1, (meanHs - lo) / (hi - lo))) * 100;

  return (
    <div className="rounded-lg border border-ocean-800 bg-ocean-900/85 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-6">
        <span className="text-[10px] uppercase tracking-wider text-[#6b8299]">
          Wave height (Hₛ)
        </span>
        <span className="mono text-[10px] text-teal-300">mean {meanHs.toFixed(2)} m</span>
      </div>
      <div className="relative">
        <div className="h-2.5 w-44 rounded-full" style={{ background: GRAD }} />
        {/* current mean marker */}
        <div
          className="absolute -top-1 h-4 w-[2px] bg-white shadow"
          style={{ left: `calc(${pos}% - 1px)` }}
        />
      </div>
      <div className="mono mt-1 flex w-44 justify-between text-[9px] text-[#6b8299]">
        {TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-[#6b8299]">
        <span>calm</span>
        <span>rough</span>
      </div>
    </div>
  );
}

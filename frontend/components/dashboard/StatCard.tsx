import clsx from "clsx";

export function StatCard({
  label,
  value,
  sub,
  accent = "#2dd4bf",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-4">
      <div className="text-[11px] uppercase tracking-wider text-[#6b8299]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">{value}</span>
        {sub && <span className={clsx("text-xs")} style={{ color: accent }}>{sub}</span>}
      </div>
      <div className="mt-2 h-0.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  );
}

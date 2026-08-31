export function MeterBar({
  value,
  color = "#2dd4bf",
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-ocean-800"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

import clsx from "clsx";

export function Chip({
  label,
  color,
  className,
}: {
  label: string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={
        color
          ? { borderColor: `${color}55`, backgroundColor: `${color}18`, color }
          : undefined
      }
    >
      {color && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  );
}

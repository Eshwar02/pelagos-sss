export const pct = (x: number): string => `${Math.round(x * 100)}%`;

export const meters = (x: number): string =>
  x >= 1000 ? `${(x / 1000).toFixed(1)} km` : `${Math.round(x)} m`;

export function relTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function priorityBand(p: number): "critical" | "high" | "medium" | "low" {
  if (p >= 0.75) return "critical";
  if (p >= 0.6) return "high";
  if (p >= 0.45) return "medium";
  return "low";
}

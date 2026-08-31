// Class + priority color mapping, shared by dashboard and map (deck.gl wants RGB).

import type { ObjectClass, TargetStatus } from "./types";

export const CLASS_LABEL: Record<ObjectClass, string> = {
  ghost_net: "Ghost net",
  gillnet: "Gillnet",
  trawl_net: "Trawl net",
  rope: "Rope / longline",
  fishing_trap: "Fishing trap",
  pipe: "Pipe / cable",
  wreck: "Wreck",
  unknown_artificial: "Unknown artificial",
};

export const CLASS_HEX: Record<ObjectClass, string> = {
  ghost_net: "#ff5470",
  gillnet: "#ff8c42",
  trawl_net: "#ffd166",
  rope: "#f4a3ff",
  fishing_trap: "#4cc9f0",
  pipe: "#8d99ae",
  wreck: "#c0c0c0",
  unknown_artificial: "#b5ff7d",
};

export const STATUS_HEX: Record<TargetStatus, string> = {
  confirmed: "#4ade80",
  candidate: "#facc15",
  review: "#f472b6",
  rejected: "#64748b",
};

export const STATUS_LABEL: Record<TargetStatus, string> = {
  confirmed: "Confirmed",
  candidate: "Candidate",
  review: "Needs review",
  rejected: "Rejected",
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Priority -> heat color (green low, red high). Used for the map's priority mode.
export function priorityHex(p: number): string {
  if (p >= 0.75) return "#ff3b30";
  if (p >= 0.6) return "#ff8c42";
  if (p >= 0.45) return "#ffd166";
  return "#4cc9f0";
}

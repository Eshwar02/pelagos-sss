// Shared types — mirror the backend Pydantic schemas.

export type ObjectClass =
  | "ghost_net"
  | "gillnet"
  | "trawl_net"
  | "rope"
  | "fishing_trap"
  | "pipe"
  | "wreck"
  | "unknown_artificial";

export type TargetStatus = "candidate" | "confirmed" | "review" | "rejected";

export interface EvidenceVector {
  detector: number;
  shadow_geometry: number;
  ping_persistence: number;
  artificiality: number;
  bathymetry_plausibility: number;
  open_set_novelty: number;
}

export interface Target {
  id: string;
  class: ObjectClass;
  status: TargetStatus;
  lat: number;
  lon: number;
  depth_m: number;
  length_m: number;
  width_m: number;
  confidence: number;
  priority: number;
  evidence: EvidenceVector;
  n_observations: number;
  entanglement_risk: number;
  reef_proximity_m: number;
  diver_accessibility: number;
  cluster_density: number;
  survey_id: string;
  first_ping: number;
  last_ping: number;
  thumbnail: string;
  detected_at: string;
}

export interface ClassCount {
  class: ObjectClass;
  count: number;
}

export interface Stats {
  total: number;
  confirmed: number;
  review: number;
  candidate: number;
  rejected: number;
  by_class: ClassCount[];
  mean_confidence: number;
  high_priority: number;
  surveyed_km2: number;
  false_alarms_per_km2: number;
  region: string;
}

export interface WaveCell {
  lat: number;
  lon: number;
  hs: number;
  dir: number;
  period: number;
}

export interface WaveField {
  time: string;
  source: "copernicus" | "fixture";
  bbox: [number, number, number, number];
  cells: WaveCell[];
}

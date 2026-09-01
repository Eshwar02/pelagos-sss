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

export interface Survey {
  id: string;
  name: string;
  region: string;
  vessel: string;
  sonar_model: string;
  frequency_khz: number;
  range_setting_m: number;
  track: [number, number][];
  surveyed_km2: number;
  operator_org: string;
  n_targets: number;
  start_ts: string;
  end_ts: string;
}

export type PipelineStage =
  | "alai_ingest"
  | "alai_preprocess"
  | "detect"
  | "valai_segment"
  | "nizhal_verify"
  | "artificiality"
  | "openset"
  | "thadam_track"
  | "geo_context"
  | "padai_prioritise";

export interface Job {
  id: string;
  survey_id: string;
  kind: "ingest" | "infer";
  state: "queued" | "running" | "done" | "error";
  stage: PipelineStage | null;
  progress: number;
  message: string;
}

export type ReviewActionKind = "confirm" | "reject" | "reclassify";

export interface ReviewAction {
  action: ReviewActionKind;
  new_class?: ObjectClass;
  operator?: string;
  note?: string;
}

export interface ReviewEvent {
  target_id: string;
  action: ReviewActionKind;
  old_class: ObjectClass;
  new_class: ObjectClass;
  old_status: TargetStatus;
  new_status: TargetStatus;
  operator: string;
  ts: string;
  note: string;
}

export interface PriorityWeights {
  confidence: number;
  entanglement: number;
  reef: number;
  access: number;
  cluster: number;
}

export interface SimilarTarget {
  target: Target;
  similarity: number;
}

export interface CalibrationBin {
  confidence: number;
  accuracy: number;
  count: number;
}

export interface StageLatency {
  stage: PipelineStage;
  ms: number;
}

export interface AblationRung {
  step: number;
  config: string;
  false_alarms_per_km2: number;
  recall: number;
}

export interface Metrics {
  survey_id: string;
  region: string;
  surveyed_km2: number;
  recall: number;
  false_alarms_per_km2: number;
  mean_confidence: number;
  localisation_error_m: number;
  pct_confirmed_multi_ping: number;
  calibration: CalibrationBin[];
  stage_latency: StageLatency[];
  ablation: AblationRung[];
}

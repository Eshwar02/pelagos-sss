import type { PipelineStage } from "./types";

// The named subsystems (report §1) — used by the inference runner and metrics.
export const STAGE_ORDER: PipelineStage[] = [
  "alai_ingest",
  "alai_preprocess",
  "detect",
  "valai_segment",
  "nizhal_verify",
  "artificiality",
  "openset",
  "thadam_track",
  "geo_context",
  "padai_prioritise",
];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  alai_ingest: "Alai · ingest",
  alai_preprocess: "Alai · preprocess",
  detect: "Detector · YOLOv11 + FiLM",
  valai_segment: "Valai · segment",
  nizhal_verify: "Nizhal · shadow physics",
  artificiality: "Verifier · artificiality",
  openset: "Open-set screen",
  thadam_track: "Thadam · track association",
  geo_context: "Geo context · GEBCO",
  padai_prioritise: "Padai · prioritise",
};

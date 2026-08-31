"use client";

import { useRef, useState } from "react";
import { Plus, UploadCloud, X, FileImage, Loader2 } from "lucide-react";
import type { Target, ObjectClass } from "@/lib/types";

const CLASSES: ObjectClass[] = [
  "ghost_net",
  "gillnet",
  "trawl_net",
  "rope",
  "fishing_trap",
  "unknown_artificial",
];

// Water inset used by the fixture generator — new detections land in open water.
const WATER = [78.82, 8.62, 79.1, 8.98];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Fabricate plausible detections for the demo when a sonar file is "analysed".
function synthTargets(n: number): Target[] {
  return Array.from({ length: n }, (_, i) => {
    const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const conf = +rand(0.55, 0.95).toFixed(3);
    const priority = +rand(0.5, 0.9).toFixed(3);
    const depth = +rand(6, 34).toFixed(1);
    return {
      id: `UP-${Date.now().toString().slice(-4)}${i}`,
      class: cls,
      status: "review",
      lat: +rand(WATER[1], WATER[3]).toFixed(5),
      lon: +rand(WATER[0], WATER[2]).toFixed(5),
      depth_m: depth,
      length_m: +rand(1, 18).toFixed(1),
      width_m: +rand(0.4, 5).toFixed(1),
      confidence: conf,
      priority,
      evidence: {
        detector: conf,
        shadow_geometry: Math.random() > 0.3 ? 1 : 0.5,
        ping_persistence: +rand(0.2, 1).toFixed(2),
        artificiality: +rand(0.5, 0.95).toFixed(2),
        bathymetry_plausibility: +rand(0.5, 1).toFixed(2),
        open_set_novelty: +rand(0.1, 0.6).toFixed(2),
      },
      n_observations: Math.ceil(rand(1, 6)),
      entanglement_risk: +rand(0.3, 0.95).toFixed(2),
      reef_proximity_m: Math.round(rand(20, 900)),
      diver_accessibility: +rand(0.3, 0.9).toFixed(2),
      cluster_density: +rand(0.2, 0.8).toFixed(2),
      survey_id: "UPLOAD",
      first_ping: 0,
      last_ping: 0,
      thumbnail: "",
      detected_at: new Date().toISOString(),
    };
  });
}

export function UploadControl({ onAnalysed }: { onAnalysed: (t: Target[]) => void }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null) => {
    if (list) setFiles((f) => [...f, ...Array.from(list)]);
  };

  const analyse = () => {
    setAnalysing(true);
    // Simulate the detection pipeline running on the uploaded sonar.
    setTimeout(() => {
      const n = Math.min(3, Math.max(1, files.length || 1));
      onAnalysed(synthTargets(n));
      setAnalysing(false);
      setFiles([]);
      setOpen(false);
    }, 1600);
  };

  return (
    <>
      {/* Round FAB, bottom-left */}
      <button
        onClick={() => setOpen(true)}
        title="Upload sonar data for analysis"
        className="absolute bottom-5 left-5 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-teal-400/40 bg-teal-400/15 text-teal-300 shadow-lg backdrop-blur transition-transform hover:scale-105 hover:bg-teal-400/25"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ocean-950/70 backdrop-blur-sm">
          <div className="w-[420px] rounded-2xl border border-ocean-700 bg-ocean-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                <UploadCloud className="h-4 w-4 text-teal-300" />
                Upload sonar data
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#6b8299] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files);
              }}
              className="cursor-pointer rounded-xl border border-dashed border-ocean-700 bg-ocean-850 px-4 py-8 text-center transition-colors hover:border-teal-400/50"
            >
              <UploadCloud className="mx-auto h-8 w-8 text-[#6b8299]" />
              <p className="mt-2 text-xs text-[#cde3ef]">
                Drop side-scan sonar files or <span className="text-teal-300">browse</span>
              </p>
              <p className="mono mt-1 text-[10px] text-[#6b8299]">
                .xtf · .jsf · .png · .tif — waterfall imagery
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".xtf,.jsf,.png,.tif,.tiff,.jpg,.jpeg,image/*"
                className="hidden"
                onChange={(e) => pick(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-3 max-h-28 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-ocean-850 px-2.5 py-1.5 text-[11px] text-[#cde3ef]"
                  >
                    <FileImage className="h-3.5 w-3.5 text-teal-300" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="mono text-[#6b8299]">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={analyse}
              disabled={analysing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400/90 py-2.5 text-sm font-medium text-ocean-950 transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              {analysing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing sonar…
                </>
              ) : (
                <>Analyse &amp; map{files.length ? ` (${files.length})` : ""}</>
              )}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#6b8299]">
              Prototype: runs a simulated detection pass and plots new targets.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

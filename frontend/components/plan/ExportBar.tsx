"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { Survey } from "@/lib/types";
import { exportUrl } from "@/lib/api";

const FORMATS: { fmt: "geojson" | "csv" | "gpx" | "kml"; note: string }[] = [
  { fmt: "gpx", note: "handheld GPS" },
  { fmt: "geojson", note: "GIS" },
  { fmt: "csv", note: "spreadsheet" },
  { fmt: "kml", note: "Google Earth" },
];

// Dive-plan export (report §9) — "this file loads into a dive team's GPS".
export function ExportBar({ surveys }: { surveys: Survey[] }) {
  const [surveyId, setSurveyId] = useState(surveys[0]?.id ?? "");

  return (
    <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <Download className="h-4 w-4 text-teal-400" />
        Export dive plan
      </h2>
      <select
        value={surveyId}
        onChange={(e) => setSurveyId(e.target.value)}
        className="mono mb-3 w-full rounded-md border border-ocean-800 bg-ocean-950 px-2 py-1.5 text-[11px] text-[#cde3ef] outline-none"
      >
        {surveys.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id} · {s.n_targets} targets
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map(({ fmt, note }) => (
          <a
            key={fmt}
            href={surveyId ? exportUrl(surveyId, fmt) : undefined}
            className="flex flex-col rounded-lg border border-ocean-800 bg-ocean-950 px-3 py-2 transition-colors hover:border-teal-400/50 hover:bg-ocean-800"
          >
            <span className="mono text-xs font-medium uppercase text-teal-300">{fmt}</span>
            <span className="text-[10px] text-[#6b8299]">{note}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

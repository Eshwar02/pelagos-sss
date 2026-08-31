import type { Target } from "@/lib/types";
import { CLASS_HEX, CLASS_LABEL, STATUS_HEX, STATUS_LABEL, priorityHex } from "@/lib/palette";
import { pct, meters, priorityBand } from "@/lib/format";
import { Chip } from "@/components/common/Chip";
import { EvidenceBar } from "@/components/common/EvidenceBar";

export function TargetTable({ targets }: { targets: Target[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ocean-800 bg-ocean-900">
      <div className="flex items-center justify-between border-b border-ocean-800 px-5 py-3.5">
        <h2 className="text-sm font-medium text-white">Ranked targets</h2>
        <span className="text-[11px] text-[#6b8299]">sorted by cleanup priority</span>
      </div>
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-ocean-850 text-[10px] uppercase tracking-wider text-[#6b8299]">
            <tr>
              <th className="px-5 py-2.5 font-medium">ID</th>
              <th className="px-3 py-2.5 font-medium">Class</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Depth</th>
              <th className="px-3 py-2.5 font-medium">Confidence</th>
              <th className="px-3 py-2.5 font-medium">Evidence provenance</th>
              <th className="px-5 py-2.5 text-right font-medium">Priority</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr
                key={t.id}
                className="border-t border-ocean-800/60 transition-colors hover:bg-ocean-850"
              >
                <td className="mono px-5 py-3 text-[#cde3ef]">{t.id}</td>
                <td className="px-3 py-3">
                  <Chip label={CLASS_LABEL[t.class]} color={CLASS_HEX[t.class]} />
                </td>
                <td className="px-3 py-3">
                  <Chip label={STATUS_LABEL[t.status]} color={STATUS_HEX[t.status]} />
                </td>
                <td className="mono px-3 py-3 text-[#8aa6bb]">{meters(t.depth_m)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ocean-800">
                      <div
                        className="h-full rounded-full bg-teal-400"
                        style={{ width: pct(t.confidence) }}
                      />
                    </div>
                    <span className="mono text-[#8aa6bb]">{pct(t.confidence)}</span>
                  </div>
                </td>
                <td className="w-40 px-3 py-3">
                  <EvidenceBar evidence={t.evidence} />
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className="mono rounded px-2 py-1 text-[11px] font-semibold"
                    style={{
                      color: priorityHex(t.priority),
                      backgroundColor: `${priorityHex(t.priority)}1a`,
                    }}
                  >
                    {t.priority.toFixed(2)} · {priorityBand(t.priority)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

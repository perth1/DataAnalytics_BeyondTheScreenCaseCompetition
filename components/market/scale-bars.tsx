import { formatCompact, formatPercent } from "@/lib/utils"
import type { ScaleRow } from "@/lib/thai-market"

/**
 * What the Thai market watches, by share of the corpus's views.
 *
 * A single series, so no legend: the heading names it. Bars are plain divs
 * rather than a chart library because there is one measure per row and a
 * recharts canvas would add an animation and a tooltip layer for no gain — the
 * numbers are printed beside every bar.
 *
 * Views are shown as a share because the absolute total is an artefact of how
 * many videos the ingest happened to collect; the share between categories is
 * the part that carries meaning.
 */
export function ScaleBars({
  rows,
  limit = 12,
}: {
  rows: ScaleRow[]
  limit?: number
}) {
  const shown = rows.slice(0, limit)
  const max = Math.max(...shown.map((r) => r.viewShare), 0)

  return (
    <div className="space-y-2.5 px-3">
      {shown.map((r) => (
        <div key={r.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">{r.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatPercent(r.viewShare)} ของยอดวิว ·{" "}
              {formatCompact(r.totalViews)} วิว · {r.videos} คลิป
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-sm">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${max > 0 ? (r.viewShare / max) * 100 : 0}%`,
                background: "var(--chart-1)",
              }}
            />
          </div>
          <p className="text-muted-foreground text-[10px] tabular-nums">
            {r.channels} ช่อง · ค่ากลาง {formatCompact(r.medianViews)} วิวต่อคลิป
            {r.shortsShare !== null &&
              ` · Shorts ${formatPercent(r.shortsShare)}`}
          </p>
        </div>
      ))}
    </div>
  )
}

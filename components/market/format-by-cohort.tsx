import { formatNumber, formatPercent } from "@/lib/utils"
import type { FormatRow } from "@/lib/thai-market"

/**
 * Shorts against long-form, by age band.
 *
 * Two series, so both are labelled directly and the legend names them — no
 * colour-only identity. Duration is a hard fact about each video, which makes
 * this the least interpretive comparison on the measured side of the page: the
 * only inference involved is the commenter's age.
 */
export function FormatByCohort({ rows }: { rows: FormatRow[] }) {
  return (
    <div className="space-y-3 px-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-1)" }}
          />
          Shorts (ไม่เกิน 3 นาที)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-4)" }}
          />
          คลิปยาว
        </span>
      </div>

      {rows.map((r) => (
        <div key={r.band} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">{r.label}</span>
            <span className="text-muted-foreground tabular-nums">
              Shorts {formatPercent(r.shortsShare)} · n={formatNumber(r.signals)}
            </span>
          </div>
          <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-sm">
            <div
              className="rounded-l-sm"
              style={{
                width: `${r.shortsShare}%`,
                background: "var(--chart-1)",
              }}
            />
            <div
              className="rounded-r-sm"
              style={{
                width: `${100 - r.shortsShare}%`,
                background: "var(--chart-4)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"

export interface FormatDatum {
  label: string
  posts: number
  views: number
  share: number
}

const RAMP = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]

export function FormatSplit({ data }: { data: FormatDatum[] }) {
  const max = Math.max(...data.map((d) => d.views), 1)

  return (
    <div className="space-y-3 px-3">
      {data.map((d, i) => (
        <div key={d.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">{d.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatCompact(d.views)} วิว · {formatNumber(d.posts)} โพสต์ ·{" "}
              {formatPercent(d.share, 1)}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((d.views / max) * 100, 1.5)}%`,
                background: RAMP[Math.min(i, RAMP.length - 1)],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

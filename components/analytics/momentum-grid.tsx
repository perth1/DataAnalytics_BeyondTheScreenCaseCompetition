import { formatPercent } from "@/lib/utils"
import { momentumDelta, TERRITORIES, type MomentumYear } from "@/lib/market"

/**
 * Small multiples instead of one eight-line chart: eight series on shared axes
 * is unreadable, and the question here is per-territory direction, not
 * cross-territory ranking (the table above already ranks them).
 *
 * Each panel is plotted on its OWN y-scale, which is why every panel prints its
 * first and last value — the shape shows direction, the numbers give magnitude.
 */
function Sparkline({ points }: { points: number[] }) {
  const width = 100
  const height = 28
  const max = Math.max(...points, 0.001)
  const min = Math.min(...points)
  const span = max - min || max || 1
  const step = points.length > 1 ? width / (points.length - 1) : 0

  const coords = points.map((value, i) => ({
    x: i * step,
    // 3px padding top and bottom keeps the 2px stroke and end dot inside the box.
    y: height - 3 - ((value - min) / span) * (height - 6),
  }))
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ")
  const last = coords[coords.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        fill="var(--chart-1)"
        stroke="var(--background)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function MomentumGrid({
  years,
  partialYear,
}: {
  years: MomentumYear[]
  partialYear?: number
}) {
  if (years.length < 2) return null

  const first = years[0]
  const last = years[years.length - 1]

  const deltas = momentumDelta(years)
  const panels = TERRITORIES.map((t) => ({
    slug: t.slug,
    label: t.label,
    points: years.map((y) => y.shares[t.slug] ?? 0),
    from: first.shares[t.slug] ?? 0,
    to: last.shares[t.slug] ?? 0,
    delta: deltas.get(t.slug) ?? 0,
  })).sort((a, b) => b.delta - a.delta)

  return (
    <div className="space-y-3 px-3">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {panels.map((p) => (
          <div key={p.slug} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium">{p.label}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {p.delta > 0 ? "+" : ""}
                {p.delta.toFixed(2)} จุด
              </span>
            </div>
            <Sparkline points={p.points} />
            <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
              <span>
                {first.year} · {formatPercent(p.from)}
              </span>
              <span>
                {last.year} · {formatPercent(p.to)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        คิดเป็นสัดส่วนของสัญญาณในแต่ละปี กลุ่มความสนใจจึงเติบโตได้แม้จำนวน
        คอมเมนต์รวมจะลดลง
        {partialYear !== undefined &&
          ` ปี ${partialYear} ยังไม่ครบปี จึงพลอตเป็นสัดส่วน ไม่ใช่จำนวนนับ`}
      </p>
    </div>
  )
}

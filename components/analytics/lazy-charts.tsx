"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { CategoryDatum } from "@/components/analytics/category-bar"
import type { TimelineDatum } from "@/components/analytics/timeline-chart"
import type { FormatSeries, FormatTimelineRow } from "@/lib/aggregate"

/**
 * The recharts charts, loaded on demand.
 *
 * Recharts is 394 kB of JavaScript and it sat in the first load of both
 * analytics pages, ahead of the tiles and tables at the top of the screen.
 * Deferring it costs nothing visually: every chart here draws through
 * `ResponsiveContainer`, which needs a measured DOM node, so none of them
 * rendered anything server-side to begin with.
 *
 * Each wrapper reserves the height its chart will take — the same expression
 * the chart itself uses — so the deferred load never shifts the page under the
 * reader.
 */

const fallback = () => <Skeleton className="h-full w-full rounded-lg" />

function Reserve({
  height,
  children,
}: {
  height: number
  children: React.ReactNode
}) {
  return <div style={{ height }}>{children}</div>
}

const CategoryBarImpl = dynamic(
  () => import("./category-bar").then((m) => m.CategoryBar),
  { ssr: false, loading: fallback },
)

export function CategoryBar(props: { data: CategoryDatum[]; unit?: string }) {
  return (
    <Reserve height={Math.max(180, props.data.length * 38 + 24)}>
      <CategoryBarImpl {...props} />
    </Reserve>
  )
}

const TimelineChartImpl = dynamic(
  () => import("./timeline-chart").then((m) => m.TimelineChart),
  { ssr: false, loading: fallback },
)

export function TimelineChart(props: { data: TimelineDatum[]; unit?: string }) {
  return (
    <Reserve height={260}>
      <TimelineChartImpl {...props} />
    </Reserve>
  )
}

const FormatTimelineChartImpl = dynamic(
  () => import("./format-timeline-chart").then((m) => m.FormatTimelineChart),
  { ssr: false, loading: fallback },
)

export function FormatTimelineChart(props: {
  data: FormatTimelineRow[]
  series: FormatSeries[]
  unit?: string
}) {
  // The chart's own 264 px plot area plus the hand-rolled legend above it.
  return (
    <Reserve height={264 + 28}>
      <FormatTimelineChartImpl {...props} />
    </Reserve>
  )
}

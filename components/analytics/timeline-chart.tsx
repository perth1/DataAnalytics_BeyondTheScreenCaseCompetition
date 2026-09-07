"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCompact } from "@/lib/utils"

export interface TimelineDatum {
  period: string
  value: number
  posts: number
}

function TooltipCard({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: { payload: TimelineDatum }[]
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {d.value.toLocaleString()} {unit}
      </p>
      <p className="text-muted-foreground tabular-nums">{d.posts} posts</p>
    </div>
  )
}

export function TimelineChart({
  data,
  unit = "views",
}: {
  data: TimelineDatum[]
  unit?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
        <XAxis
          dataKey="period"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatCompact(v)}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          content={<TooltipCard unit={unit} />}
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

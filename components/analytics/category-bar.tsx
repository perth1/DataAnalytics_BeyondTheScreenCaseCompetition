"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCompact } from "@/lib/utils"

export interface CategoryDatum {
  name: string
  value: number
  posts: number
}

/** Monochrome sequential ramp: darkest carries the largest magnitude. */
const RAMP = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-3)",
  "var(--chart-4)",
]

function TooltipCard({
  active,
  payload,
  unit,
}: {
  active?: boolean
  payload?: { payload: CategoryDatum }[]
  unit: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {d.value.toLocaleString()} {unit}
      </p>
      <p className="text-muted-foreground tabular-nums">{d.posts} posts</p>
    </div>
  )
}

export function CategoryBar({
  data,
  unit = "views",
}: {
  data: CategoryDatum[]
  unit?: string
}) {
  const height = Math.max(180, data.length * 38 + 24)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
        <CartesianGrid
          horizontal={false}
          stroke="var(--border)"
          strokeDasharray="2 4"
        />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatCompact(v)}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<TooltipCard unit={unit} />}
          cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={18}
          label={{
            position: "right",
            fontSize: 11,
            fill: "var(--muted-foreground)",
            formatter: (v: unknown) => formatCompact(Number(v)),
          }}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={RAMP[Math.min(i, RAMP.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

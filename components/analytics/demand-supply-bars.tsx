"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatPercent } from "@/lib/utils"

export interface DemandSupplyDatum {
  name: string
  demandShare: number
  supplyShare: number
  signals: number
  postCount: number
}

/**
 * Both series are a share of their own total, so they share one percentage
 * axis — the comparison is only legible because demand and supply were scored
 * by the same lexicon.
 *
 * Enter animation is off. This page gets screenshotted into the case deck, and
 * recharts draws nothing until its animation runs, so an animated chart comes
 * out blank in headless capture and in print. Nothing is gained by flying two
 * dozen bars in on a dense comparison anyway.
 */
function TooltipCard({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: DemandSupplyDatum }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const gap = d.demandShare - d.supplyShare

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{d.name}</p>
      <dl className="mt-1.5 space-y-0.5">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">อุปสงค์ผู้ชม</dt>
          <dd className="tabular-nums">{formatPercent(d.demandShare)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">อุปทานคอนเทนต์</dt>
          <dd className="tabular-nums">{formatPercent(d.supplyShare)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-0.5">
          <dt className="text-muted-foreground">ช่องว่าง</dt>
          <dd className="tabular-nums">
            {gap > 0 ? "+" : ""}
            {formatPercent(gap)} จุด
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-1.5 tabular-nums">
        {d.signals.toLocaleString()} สัญญาณจากคอมเมนต์ · {d.postCount} โพสต์
      </p>
    </div>
  )
}

export function DemandSupplyBars({ data }: { data: DemandSupplyDatum[] }) {
  const height = Math.max(220, data.length * 46 + 32)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-1)" }}
          />
          อุปสงค์ผู้ชม (สัดส่วนสัญญาณจากคอมเมนต์)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ background: "var(--chart-4)" }}
          />
          อุปทานคอนเทนต์ (สัดส่วนโพสต์ที่จัดกลุ่มได้)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          barGap={2}
          margin={{ left: 8, right: 52, top: 4, bottom: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v}%`}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<TooltipCard />}
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
          />
          <Bar
            dataKey="demandShare"
            name="อุปสงค์ผู้ชม"
            fill="var(--chart-1)"
            radius={[0, 4, 4, 0]}
            barSize={12}
            isAnimationActive={false}
            label={{
              position: "right",
              fontSize: 11,
              fill: "var(--muted-foreground)",
              formatter: (v: unknown) => `${Number(v).toFixed(1)}%`,
            }}
          />
          <Bar
            dataKey="supplyShare"
            name="อุปทานคอนเทนต์"
            fill="var(--chart-4)"
            radius={[0, 4, 4, 0]}
            barSize={12}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

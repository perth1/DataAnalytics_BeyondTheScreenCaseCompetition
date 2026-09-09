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
import type { FormatSeries, FormatTimelineRow } from "@/lib/aggregate"
import { formatCompact } from "@/lib/utils"

/**
 * The palette is a lightness ramp with no hue, so two lines crossing would be
 * told apart by shade alone. Each series also gets its own dash pattern.
 */
const STYLES = [
  { color: "var(--chart-1)", dash: undefined },
  { color: "var(--chart-3)", dash: "6 4" },
  { color: "var(--chart-4)", dash: "2 3" },
] as const

const styleFor = (i: number) => STYLES[Math.min(i, STYLES.length - 1)]

function TooltipCard({
  active,
  payload,
  label,
  series,
  unit,
}: {
  active?: boolean
  payload?: { payload: FormatTimelineRow }[]
  label?: string
  series: FormatSeries[]
  unit: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{label}</p>
      {series.map((s, i) => {
        const value = row[s.key]
        if (value === null || value === undefined) return null
        return (
          <p
            key={s.key}
            className="mt-1 flex items-center gap-1.5 tabular-nums"
          >
            <svg aria-hidden width="14" height="2" className="shrink-0">
              <line
                x1="0"
                y1="1"
                x2="14"
                y2="1"
                stroke={styleFor(i).color}
                strokeWidth="2"
                strokeDasharray={styleFor(i).dash}
              />
            </svg>
            <span>{s.label}</span>
            <span className="text-muted-foreground">
              {Number(value).toLocaleString()} {unit} ·{" "}
              {Number(row[`${s.key}__posts`] ?? 0)} โพสต์
            </span>
          </p>
        )
      })}
    </div>
  )
}

function SeriesSwatch({ index }: { index: number }) {
  const style = styleFor(index)
  return (
    <svg aria-hidden width="16" height="2" className="shrink-0">
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke={style.color}
        strokeWidth="2"
        strokeDasharray={style.dash}
      />
    </svg>
  )
}

/**
 * Average views per post per month, one line per format.
 *
 * The legend is hand-rolled rather than recharts' own: it keeps the series in
 * the order they were passed (recharts reverses them) and carries the dash
 * pattern, which is half of what distinguishes the lines here.
 */
export function FormatTimelineChart({
  data,
  series,
  unit = "วิว",
}: {
  data: FormatTimelineRow[]
  series: FormatSeries[]
  unit?: string
}) {
  return (
    <div className="space-y-1">
      <ul className="text-muted-foreground flex flex-wrap justify-end gap-x-4 gap-y-1 px-3 text-xs">
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <SeriesSwatch index={i} />
            {s.label}
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={264}>
        <LineChart
          data={data}
          margin={{ left: 4, right: 16, top: 8, bottom: 4 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
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
            content={<TooltipCard series={series} unit={unit} />}
            cursor={{
              stroke: "var(--muted-foreground)",
              strokeDasharray: "3 3",
            }}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              name={s.label}
              type="monotone"
              dataKey={s.key}
              stroke={styleFor(i).color}
              strokeDasharray={styleFor(i).dash}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

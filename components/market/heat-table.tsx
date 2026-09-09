import { cn } from "@/lib/utils"

/**
 * A rows × columns table shaded by value, with every cell printing its own
 * number. Used for both layers of the market page — survey percentages and
 * measured over-indices — so the two read as one visual language.
 *
 * The colour rules are inherited from components/analytics/cohort-matrix.tsx,
 * and the reasoning is worth restating because it constrains the ramp:
 *
 *   - The palette is achromatic by design (app/globals.css defines --chart-1..5
 *     as neutral steps), so a cell is foreground ink mixed into the page. That
 *     makes the ramp a single-hue sequential scale, which is the correct
 *     encoding for magnitude and is colourblind-safe by construction.
 *   - The steps are quantised, not continuous. As the mix approaches half, the
 *     cell lands mid-grey, where neither the foreground nor the background text
 *     token clears 4.5:1. The steps skip that dead band, and the ink flips to
 *     the page colour above it.
 *   - Nothing is encoded by colour alone: every cell shows its value, and thin
 *     cells show their n instead of a rate.
 */

export interface HeatCell {
  /** null renders as an empty cell — the source published nothing here. */
  value: number | null
  /** Sample size behind the cell, shown when the cell is too thin to rate. */
  n?: number
  thin?: boolean
}

export interface HeatColumn {
  key: string
  label: string
  sub?: string | null
}

export interface HeatRow {
  label: string
  sub?: string | null
  cells: HeatCell[]
}

/** Steps for an index scale, where 1.0 is "exactly average". */
const INDEX_STEPS: { min: number; mix: number }[] = [
  { min: 3.0, mix: 0.86 },
  { min: 2.5, mix: 0.7 },
  { min: 2.0, mix: 0.34 },
  { min: 1.6, mix: 0.22 },
  { min: 1.2, mix: 0.1 },
]

/** Steps for a share scale, as a fraction of the table's own maximum. */
const SHARE_STEPS: { min: number; mix: number }[] = [
  { min: 0.85, mix: 0.86 },
  { min: 0.7, mix: 0.7 },
  { min: 0.55, mix: 0.34 },
  { min: 0.4, mix: 0.22 },
  { min: 0.2, mix: 0.1 },
]

const INK_FLIP_MIX = 0.5

function cellStyle(mix: number) {
  if (mix === 0) return undefined
  return {
    backgroundColor: `color-mix(in oklab, var(--foreground) ${(mix * 100).toFixed(0)}%, transparent)`,
    color: mix > INK_FLIP_MIX ? "var(--background)" : "var(--foreground)",
  }
}

export function HeatTable({
  columns,
  rows,
  scale,
  format,
  rowHeader = "",
  className,
}: {
  columns: HeatColumn[]
  rows: HeatRow[]
  scale: "index" | "share"
  format: (v: number) => string
  rowHeader?: string
  className?: string
}) {
  const max = Math.max(
    ...rows.flatMap((r) => r.cells.map((c) => (c.thin ? 0 : (c.value ?? 0)))),
    0,
  )

  function mixFor(cell: HeatCell) {
    if (cell.thin || cell.value === null) return 0
    if (scale === "index") {
      return INDEX_STEPS.find((s) => cell.value! >= s.min)?.mix ?? 0
    }
    const ratio = max > 0 ? cell.value / max : 0
    return SHARE_STEPS.find((s) => ratio >= s.min)?.mix ?? 0
  }

  return (
    <div className={cn("relative w-full overflow-x-auto", className)}>
      <table className="w-full caption-bottom border-separate border-spacing-[2px] text-sm">
        <thead>
          <tr>
            <th className="text-muted-foreground sticky left-0 min-w-[150px] bg-[var(--background)] px-2 py-2 text-left text-xs font-medium">
              {rowHeader}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-muted-foreground min-w-[84px] px-1.5 py-2 text-center align-bottom text-xs font-medium"
              >
                <span className="block">{c.label}</span>
                {c.sub && (
                  <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                    {c.sub}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th
                scope="row"
                className="sticky left-0 bg-[var(--background)] px-2 py-1.5 text-left text-xs font-medium"
              >
                <span className="block">{r.label}</span>
                {r.sub && (
                  <span className="text-muted-foreground mt-0.5 block text-[10px] font-normal">
                    {r.sub}
                  </span>
                )}
              </th>
              {r.cells.map((cell, i) => (
                <td
                  key={columns[i]?.key ?? i}
                  className="rounded-md px-1.5 py-2 text-center text-xs tabular-nums"
                  style={cellStyle(mixFor(cell))}
                >
                  {/* Order matters: a thin cell has a null value BECAUSE it
                      is thin, and must show its n. Only a cell with no value
                      and no sample behind it is genuinely absent data. */}
                  {cell.thin ? (
                    <span className="text-muted-foreground">n={cell.n ?? 0}</span>
                  ) : cell.value === null ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : (
                    format(cell.value)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
import { formatNumber, formatPercent } from "@/lib/utils"
import { MIN_CELL_SIGNALS, TERRITORIES, type CohortRow } from "@/lib/market"

/**
 * Cohort × territory, shaded by index rather than by share.
 *
 * Every cohort talks about entertainment most, so a share heatmap would just
 * restate that. The index — this cohort's share divided by that territory's
 * share across ALL life-stage-signalled comments, not across every comment, so
 * the comparison carries the same self-selection on both sides —
 * is what isolates what a cohort cares about MORE than the audience at large.
 *
 * The scale is a single-hue (here neutral) sequential ramp built from the theme
 * tokens, so it inverts correctly in dark mode and carries no hue that a
 * colourblind reader could confuse. Each cell also prints its own number, so
 * nothing is encoded by colour alone.
 *
 * The steps are quantised rather than continuous, and the reason is contrast. A
 * cell is foreground ink mixed into the page, so as the mix approaches half the
 * cell lands mid-grey — where neither foreground nor background text clears
 * 4.5:1. The mix behaves symmetrically in both themes (light mode runs
 * white→black, dark mode black→white), so one rule holds for both: keep text in
 * the foreground token below the halfway mark and flip it above. These steps
 * simply skip the 0.40–0.65 dead band where that flip has no safe answer, which
 * costs nothing because every cell prints its index anyway.
 */
const STEPS: { min: number; mix: number }[] = [
  { min: 3.0, mix: 0.86 },
  { min: 2.5, mix: 0.7 },
  { min: 2.0, mix: 0.34 },
  { min: 1.6, mix: 0.22 },
  { min: 1.2, mix: 0.1 },
]

/** Above this mix the cell is dark enough that text must flip to the page colour. */
const INK_FLIP_MIX = 0.5

function mixFor(index: number) {
  return STEPS.find((s) => index >= s.min)?.mix ?? 0
}

function cellStyle(index: number, thin: boolean) {
  const mix = thin ? 0 : mixFor(index)
  if (mix === 0) return undefined
  return {
    backgroundColor: `color-mix(in oklab, var(--foreground) ${(mix * 100).toFixed(0)}%, transparent)`,
    color: mix > INK_FLIP_MIX ? "var(--background)" : "var(--foreground)",
  }
}

export function CohortMatrix({ rows }: { rows: CohortRow[] }) {
  return (
    <div className="space-y-4">
      <div className="relative w-full overflow-x-auto">
        <table className="w-full caption-bottom border-separate border-spacing-[2px] text-sm">
          <thead>
            <tr>
              <th className="text-muted-foreground sticky left-0 min-w-[168px] bg-[var(--background)] px-2 py-2 text-left text-xs font-medium">
                ช่วงวัย
              </th>
              {TERRITORIES.map((t) => (
                <th
                  key={t.slug}
                  className="text-muted-foreground min-w-[76px] px-1.5 py-2 text-center align-bottom text-xs font-medium"
                >
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.meta.slug}>
                <th className="sticky left-0 bg-[var(--background)] px-2 py-2 text-left align-middle font-normal">
                  <span className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-xs font-medium">{row.meta.label}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {row.meta.approxAge}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs tabular-nums">
                    n = {formatNumber(row.signals)}
                    {row.meta.weak && " · สัญญาณอ่อน"}
                  </span>
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.territory}
                    style={cellStyle(cell.index, cell.thin)}
                    className="rounded-md px-1.5 py-2 text-center align-middle"
                    title={`${row.meta.label} · ${cell.label}: ${cell.signals} จาก ${row.signals} สัญญาณ (${formatPercent(cell.share)}) คิดเป็น ${cell.index.toFixed(2)} เท่าของค่าเฉลี่ยกลุ่มที่ระบุช่วงวัย${cell.thin ? " — สัญญาณน้อยเกินกว่าจะสรุป" : ""}`}
                  >
                    <span className="block text-xs tabular-nums">
                      {cell.signals === 0 ? "—" : formatPercent(cell.share, 1)}
                    </span>
                    <span
                      className={
                        cell.thin
                          ? "text-muted-foreground block text-xs tabular-nums"
                          : "block text-xs tabular-nums opacity-70"
                      }
                    >
                      {cell.signals === 0
                        ? ""
                        : cell.thin
                          ? `n=${cell.signals}`
                          : `${cell.index.toFixed(1)}\u00d7`}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-[2px]">
            {[1, 1.2, 1.6, 2, 2.5, 3].map((i) => (
              <span
                key={i}
                className="size-3.5 rounded-sm border"
                style={cellStyle(i, false)}
              />
            ))}
          </span>
          ความเข้ม = ดัชนีเทียบค่าเฉลี่ยของกลุ่มที่ระบุช่วงวัย (1 → 3 เท่าขึ้นไป)
        </span>
        <span>
          ตัวเลขบนคือสัดส่วนภายในกลุ่มวัยนั้น ตัวเลขล่างคือดัชนี หรือแสดงจำนวน n
          แทนเมื่อมีสัญญาณน้อยกว่า {MIN_CELL_SIGNALS} รายการ ซึ่งน้อยเกินกว่าจะ
          อ่านเป็นดัชนีได้
        </span>
      </div>
    </div>
  )
}

/** The matrix in words: what each cohort over-indexes on, and where it shows up. */
export function CohortLeans({ rows }: { rows: CohortRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.meta.slug} className="space-y-3 rounded-xl border p-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                {row.meta.label}
              </h3>
              <Badge variant="muted">{row.meta.approxAge}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">{row.meta.note}</p>
          </div>

          <p className="text-muted-foreground text-xs tabular-nums">
            {formatNumber(row.signals)} สัญญาณความสนใจ
            {row.meta.weak && " · สัญญาณระบุวัยอ่อน"}
          </p>

          {row.leans.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">สนใจมากกว่าค่าเฉลี่ย</p>
              <ul className="space-y-1.5">
                {row.leans.slice(0, 3).map((cell) => (
                  <li
                    key={cell.territory}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span>{cell.label}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {cell.index.toFixed(1)} เท่า · {formatPercent(cell.share, 1)} ·
                      n={cell.signals}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              ยังไม่มีกลุ่มความสนใจใดที่สัญญาณมากพอจะสรุปว่าเอนเอียงชัดเจน
            </p>
          )}

          {row.topSeries.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-semibold">คอมเมนต์มากที่สุดใน</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {row.topSeries.map((s) => (
                  <li key={s.slug} className="flex justify-between gap-3">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 tabular-nums">{s.signals}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

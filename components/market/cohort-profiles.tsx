import { formatCompact, formatNumber } from "@/lib/utils"
import type { MatrixRow } from "@/lib/thai-market"
import type { MarketCohortVideo } from "@/lib/types"
import { categoryLabel, MIN_COHORT_SIGNALS } from "@/lib/thai-market"

/**
 * One card per age band: what it over-indexes on, and the content it was
 * actually measured on.
 *
 * The videos are the point. An over-index is a ratio, and a ratio built from a
 * few dozen comments is easy to over-read — showing the specific videos behind
 * it lets a reader judge whether the signal is a real pattern or three comments
 * on one viral clip. Cohorts under MIN_COHORT_SIGNALS say so on the card
 * instead of presenting their leans as findings.
 */
export function CohortProfiles({
  rows,
  videos,
  quotes,
}: {
  rows: MatrixRow[]
  videos: MarketCohortVideo[]
  quotes: Record<string, { text: string; stated_age: number | null }[]>
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => {
        const mine = videos.filter((v) => v.cohort === row.band).slice(0, 3)
        const thin = row.signals < MIN_COHORT_SIGNALS
        const said = quotes[row.band] ?? []

        return (
          <div key={row.band} className="space-y-3 rounded-xl border p-5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{row.meta.label}</p>
                <p className="text-muted-foreground text-xs">
                  {row.meta.ageRange} ปี
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {formatNumber(row.signals)}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  คอมเมนต์ที่ระบุตัวเอง
                </p>
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              {formatNumber(row.statedAgeSignals)} รายการบอกอายุเป็นตัวเลข
              {row.avgStatedAge !== null &&
                ` เฉลี่ย ${row.avgStatedAge.toFixed(1)} ปี`}{" "}
              · จาก {formatNumber(row.videos)} คลิป {formatNumber(row.channels)}{" "}
              ช่อง
            </p>

            {thin ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
                สัญญาณยังน้อยกว่า {MIN_COHORT_SIGNALS} รายการ
                จึงยังไม่สรุปความสนใจของช่วงวัยนี้จากข้อมูลที่วัดเอง
                ให้อ่านชั้นงานวิจัยด้านบนแทน
              </p>
            ) : row.leans.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">สนใจมากกว่าค่าเฉลี่ย</p>
                {row.leans.slice(0, 4).map((c) => (
                  <div
                    key={c.key}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="tabular-nums">
                      {c.index?.toFixed(1)}× · n={c.signals}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                ยังไม่มีหมวดใดที่ช่วงวัยนี้สนใจสูงกว่าค่าเฉลี่ยอย่างชัดเจน
              </p>
            )}

            {mine.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium">คลิปที่วัดสัญญาณได้มากที่สุด</p>
                {mine.map((v) => (
                  <div key={v.video_id} className="text-xs">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 underline-offset-2 hover:underline"
                    >
                      {v.video_title}
                    </a>
                    <p className="text-muted-foreground tabular-nums">
                      {v.channel_title} · {categoryLabel(v.category_id)} ·{" "}
                      {formatCompact(Number(v.views))} วิว · n={v.cohort_signals}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {said.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium">ตัวอย่างหลักฐาน</p>
                {said.slice(0, 2).map((q, i) => (
                  <blockquote
                    key={i}
                    className="text-muted-foreground border-l-2 pl-2.5 text-xs italic"
                  >
                    {q.text.replace(/\s+/g, " ").slice(0, 160)}
                    {q.text.length > 160 && "…"}
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

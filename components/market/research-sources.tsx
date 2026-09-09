import { BookOpen, TriangleAlert } from "lucide-react"
import {
  RESEARCH_OMITTED,
  RESEARCH_SOURCES,
} from "@/lib/market-research"

/**
 * Attribution for the survey layer, including what could NOT be sourced.
 *
 * The omitted list is not padding. Two of the figures asked for — how many
 * people in each age band buy what an influencer endorsed, and what time of day
 * each band watches — either sit behind a paywall or are not published for
 * Thailand at all. A reader who cannot see that gap will assume the page simply
 * had nothing to say about it, or worse, read a nearby number as its answer.
 */
export function ResearchSources() {
  return (
    <section className="space-y-4 rounded-xl border px-5 py-5">
      <div className="flex items-start gap-3">
        <BookOpen className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            แหล่งอ้างอิงงานวิจัย
          </h2>
          <p className="text-muted-foreground text-xs">
            ทุกตัวเลขในชั้นนี้คัดลอกจากต้นฉบับตามช่วงวัยที่ต้นฉบับใช้
            ไม่มีการเกลี่ยหรือแปลงช่วงวัย
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {Object.entries(RESEARCH_SOURCES).map(([key, s]) => (
          <li key={key} className="border-t pt-3 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">· {s.publisher}</span>
              <span className="text-muted-foreground tabular-nums">
                {s.year}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{s.name_en}</p>
            <p className="text-muted-foreground mt-1">
              กลุ่มตัวอย่าง: {s.sample_size}
            </p>
            {s.note && <p className="text-muted-foreground mt-1">{s.note}</p>}
            <p className="mt-1">
              {s.url_status === "verified" ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  เปิดแหล่งข้อมูล
                </a>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  ลิงก์ตรงไปยังไฟล์ต้นฉบับยังตรวจสอบไม่ได้ ให้ค้นชื่อรายงานจาก
                  เว็บไซต์ผู้เผยแพร่
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t pt-3">
        <p className="text-xs font-medium">สิ่งที่หาข้อมูลเผยแพร่ไม่ได้</p>
        <ul className="mt-2 space-y-2">
          {RESEARCH_OMITTED.map((o) => (
            <li key={o.what} className="text-muted-foreground text-xs">
              <span className="text-foreground">{o.what}</span> — {o.why}
              {o.source_name !== "—" && ` (${o.source_name})`}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

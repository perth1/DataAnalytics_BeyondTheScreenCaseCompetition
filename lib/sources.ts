/**
 * แหล่งที่มาข้อมูล — provenance for every number on the analytics pages.
 *
 * Kept as data, not prose, so the site can state where each figure came from
 * without the claim drifting away from what the ingest scripts actually pull.
 * Each entry names the artefact in this repo that produces it, so a reader can
 * follow a number back to the code that made it.
 */
export interface DataSource {
  name: string
  /** What this source contributes to the pages. */
  provides: string
  /** How it is pulled, and which file in this repo does it. */
  detail: string
  url?: string
}

export const DATA_SOURCES: DataSource[] = [
  {
    name: "YouTube Data API v3",
    provides:
      "ข้อมูลช่อง จำนวนผู้ติดตาม รายการวิดีโอ ยอดวิว ไลก์ จำนวนคอมเมนต์ และเนื้อหาคอมเมนต์",
    detail:
      "ดึงจากปลายทางสาธารณะด้วย scripts/ingest/youtube.ts จึงไม่ต้องเป็นเจ้าของช่อง",
    url: "https://developers.google.com/youtube/v3",
  },
  {
    name: "การจัดกลุ่มซีรีส์ด้วยกฎ (rule-based)",
    provides: "ระบุว่าแต่ละโพสต์อยู่ในรายการ (ซีรีส์) ใด",
    detail:
      "จับคำในชื่อเรื่อง คำอธิบาย และแฮชแท็ก ตามกฎใน lib/classify.ts ตรวจสอบย้อนกลับได้ทุกข้อ",
  },
  {
    name: "Claude (claude-opus-5)",
    provides:
      "จัดธีมรายโพสต์ สรุปคอมเมนต์ และกำหนดชุดคำ (lexicon) ของกลุ่มความสนใจกับช่วงวัย",
    detail:
      "ชุดคำทั้งหมดเขียนไว้ในไฟล์ supabase/migrations/0008_market_analysis.sql ไม่ได้ซ่อนอยู่ในโมเดล",
  },
  {
    name: "Supabase (PostgreSQL)",
    provides: "จัดเก็บข้อมูลและรวมผลเป็น view ที่หน้าเว็บอ่านตรง",
    detail:
      "สคีมาและ view ทั้งหมดอยู่ใน supabase/migrations/ เรียงตามลำดับการแก้ไข",
  },
]

/**
 * The disclosure that matters most on the Market page: the one source that
 * would give real demographics is the one we cannot reach.
 */
export const NOT_SOURCED =
  "ไม่ได้ใช้ YouTube Analytics API ซึ่งเป็นแหล่งเดียวที่ให้ข้อมูลอายุและเพศจริง เพราะเปิดให้เฉพาะเจ้าของช่อง ข้อมูลช่วงวัยในหน้านี้จึงอนุมานจากภาษาที่ผู้ชมบอกเกี่ยวกับตัวเองในคอมเมนต์"

/** Only YouTube has been ingested; the other platform tabs are still empty. */
export const PLATFORM_COVERAGE =
  "ปัจจุบันมีเฉพาะข้อมูล YouTube — TikTok, Instagram และ Facebook ต้องนำเข้าจากไฟล์ CSV ที่ส่งออกจากหลังบ้านของแต่ละแพลตฟอร์ม"

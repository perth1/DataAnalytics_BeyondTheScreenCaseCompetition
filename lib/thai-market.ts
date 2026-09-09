/**
 * Taxonomy for the Thai audience-market read.
 *
 * THE DESIGN, AND WHY IT IS THIS WAY
 * The question is "which content does each age group in Thailand care about".
 * Answering it needs two independent facts per comment-video pair, and the
 * trick is that each comes from the side that can actually be trusted for it:
 *
 *   age      ← the COMMENT, and only when the commenter states their own age
 *              (lib/cohort.ts resolves whose age it is)
 *   content  ← the VIDEO, from YouTube's own categoryId, which is metadata the
 *              uploader set, not something inferred from words
 *
 * The previous version of this page inferred BOTH sides from a Thai keyword
 * lexicon over the channel's own comments, so a comment mentioning อาหาร became
 * evidence of food demand no matter what the video was, and every number was
 * about one channel. Here the interest signal is the video's real category and
 * the corpus spans thousands of Thai channels, so "senior viewers over-index on
 * News & Politics" is a statement about the Thai market, not about us.
 */
import type { CohortBand } from "@/lib/cohort"

export interface CohortMeta {
  band: CohortBand
  label: string
  ageRange: string
  /** What this band tends to say about itself, for the evidence column. */
  note: string
}

/** Display order is age order. */
export const COHORTS: CohortMeta[] = [
  {
    band: "teen",
    label: "วัยมัธยม",
    ageRange: "13–19",
    note: "บอกอายุตรง ๆ หรือบอกว่าเรียนอยู่ ม.ต้น–ม.ปลาย",
  },
  {
    band: "uni",
    label: "วัยมหาลัย",
    ageRange: "20–24",
    note: "บอกอายุ หรือบอกว่าเรียนมหาลัย ฝึกงาน จบใหม่",
  },
  {
    band: "working",
    label: "วัยทำงาน",
    ageRange: "25–39",
    note: "บอกอายุ หรือระบุตัวเองว่าเป็นมนุษย์เงินเดือน พนักงานประจำ",
  },
  {
    band: "midlife",
    label: "วัยกลางคน",
    ageRange: "40–54",
    note: "บอกอายุเป็นตัวเลขเกือบทั้งหมด",
  },
  {
    band: "senior",
    label: "วัยเกษียณ",
    ageRange: "55+",
    note: "บอกอายุ หรือบอกว่าเกษียณแล้ว เป็นยาย/ปู่แล้ว",
  },
]

export const COHORT_MAP = Object.fromEntries(
  COHORTS.map((c) => [c.band, c]),
) as Record<CohortBand, CohortMeta>

/**
 * YouTube's assignable categories for regionCode=TH, with the Thai labels the
 * API itself returns. Ids are YouTube's and are stable.
 */
export const CATEGORIES: { id: number; label: string; labelEn: string }[] = [
  { id: 1, label: "ภาพยนตร์และแอนิเมชัน", labelEn: "Film & Animation" },
  { id: 2, label: "ยานยนต์และพาหนะ", labelEn: "Autos & Vehicles" },
  { id: 10, label: "เพลง", labelEn: "Music" },
  { id: 15, label: "สัตว์เลี้ยงและสัตว์", labelEn: "Pets & Animals" },
  { id: 17, label: "กีฬา", labelEn: "Sports" },
  { id: 19, label: "ท่องเที่ยวและกิจกรรม", labelEn: "Travel & Events" },
  { id: 20, label: "เกม", labelEn: "Gaming" },
  { id: 22, label: "บุคคลและบล็อก", labelEn: "People & Blogs" },
  { id: 23, label: "ตลก", labelEn: "Comedy" },
  { id: 24, label: "บันเทิง", labelEn: "Entertainment" },
  { id: 25, label: "ข่าวและการเมือง", labelEn: "News & Politics" },
  { id: 26, label: "ฮาวทูและสไตล์", labelEn: "Howto & Style" },
  { id: 27, label: "การศึกษา", labelEn: "Education" },
  { id: 28, label: "วิทยาศาสตร์และเทคโนโลยี", labelEn: "Science & Technology" },
  { id: 29, label: "องค์กรไม่แสวงหากำไรและกิจกรรมเพื่อสังคม", labelEn: "Nonprofits & Activism" },
]

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoryLabel(id: number | null): string {
  if (id === null) return "ไม่ระบุหมวด"
  return CATEGORY_MAP.get(id)?.label ?? `หมวด ${id}`
}

/**
 * Topic themes, applied to the VIDEO's title, description and tags — never to
 * comment text. YouTube's 15 categories are too coarse to separate การเงิน from
 * สุขภาพ (both land in People & Blogs or Howto & Style), so this adds the layer
 * the categories cannot express. First match wins, so specific themes are
 * tested before broad ones.
 */
export interface ThemeMeta {
  slug: string
  label: string
  pattern: RegExp
}

export const THEMES: ThemeMeta[] = [
  {
    slug: "money",
    label: "การเงิน & ลงทุน",
    pattern: /ลงทุน|หุ้น|กองทุน|เก็บเงิน|ออมเงิน|หนี้|การเงิน|คริปโต|ธุรกิจ|รวย|เงินเดือน|ภาษี|ประกัน/,
  },
  {
    slug: "career",
    label: "งาน & อาชีพ",
    pattern: /สมัครงาน|หางาน|อาชีพ|ลาออก|สัมภาษณ์งาน|เจ้านาย|ที่ทำงาน|ฟรีแลนซ์|เงินเดือนแรก/,
  },
  {
    slug: "health",
    label: "สุขภาพ",
    pattern: /สุขภาพ|ออกกำลังกาย|ฟิตเนส|โยคะ|ลดน้ำหนัก|อาหารเสริม|วิตามิน|นอนไม่หลับ|โรค|รักษา|หมอ|ป่วย|สุขภาพจิต|ซึมเศร้า/,
  },
  {
    slug: "study",
    label: "เรียน & สอบ",
    pattern: /ติวเตอร์|สอบเข้า|ทีแคส|tcas|มหาลัย|การบ้าน|วิชา|เรียนต่อ|ทุนการศึกษา|ภาษาอังกฤษ/,
  },
  {
    slug: "family",
    label: "ครอบครัว & เลี้ยงลูก",
    pattern: /เลี้ยงลูก|ลูกน้อย|คุณแม่|ตั้งท้อง|คลอด|ครอบครัว|พ่อแม่|ลูกสาว|ลูกชาย|เด็กแรกเกิด/,
  },
  {
    slug: "love",
    label: "ความรัก",
    pattern: /ความรัก|แฟน|คู่รัก|แต่งงาน|อกหัก|โสด|จีบ|นอกใจ|เลิกกัน|คนคุย/,
  },
  {
    slug: "beauty",
    label: "ความงาม & แฟชั่น",
    pattern: /แต่งหน้า|สกินแคร์|ครีม|ลิป|เสื้อผ้า|แฟชั่น|ทรงผม|ผิว|เครื่องสำอาง|รีวิวเครื่องสำอาง/,
  },
  {
    slug: "food",
    label: "อาหาร",
    pattern: /ร้านอาหาร|เมนู|ทำอาหาร|ของกิน|คาเฟ่|บุฟเฟ่ต์|อร่อย|กินอะไร|สตรีทฟู้ด|ขนม/,
  },
  {
    slug: "travel",
    label: "ท่องเที่ยว",
    pattern: /เที่ยว|ทริป|ที่พัก|โรงแรม|สายการบิน|ต่างประเทศ|พาเที่ยว|เดินทาง/,
  },
  {
    slug: "dhamma",
    label: "ธรรมะ & ความเชื่อ",
    pattern: /ธรรมะ|ทำบุญ|พระ|วัด|สวดมนต์|กรรม|ดวง|หมอดู|มูเตลู|ฮวงจุ้ย/,
  },
  {
    slug: "tech",
    label: "เทค & แกดเจ็ต",
    pattern: /มือถือ|ไอโฟน|iphone|android|โน๊ตบุ๊ค|คอมพิวเตอร์|แอป|ai|รีวิวมือถือ|กล้อง/,
  },
  {
    slug: "pets",
    label: "สัตว์เลี้ยง",
    pattern: /หมา|แมว|สัตว์เลี้ยง|น้องหมา|น้องแมว|ปลา|กระต่าย/,
  },
  {
    slug: "auto",
    label: "รถ & ยานยนต์",
    pattern: /รถยนต์|มอเตอร์ไซค์|บิ๊กไบค์|รีวิวรถ|รถไฟฟ้า|ev|ขับรถ/,
  },
  {
    slug: "news",
    label: "ข่าว & สังคม",
    pattern: /ข่าว|การเมือง|เลือกตั้ง|คดี|ตำรวจ|ศาล|ประท้วง|สังคม|เศรษฐกิจ/,
  },
  {
    slug: "gaming",
    label: "เกม",
    pattern: /เกม|เล่นเกม|roblox|freefire|valorant|เกมมือถือ|มายคราฟ|minecraft|gta/,
  },
  {
    slug: "music",
    label: "เพลง",
    pattern: /เพลง|mv|เนื้อเพลง|คอนเสิร์ต|คัฟเวอร์|cover|ost|official mv|karaoke|คาราโอเกะ/,
  },
  {
    slug: "series",
    label: "ซีรีส์ & ดารา",
    pattern: /ซีรีส์|ละคร|ตัวอย่าง|ep\.|ตอนที่|นักแสดง|ดารา|หนัง|trailer|เบื้องหลัง/,
  },
  {
    slug: "comedy",
    label: "ตลก & วาไรตี้",
    pattern: /ตลก|ขำ|ฮา|แกล้ง|ชาเลนจ์|challenge|เกมโชว์|วาไรตี้|รายการ/,
  },
]

/** The theme of a video, from what the uploader wrote about it. */
export function classifyTheme(
  title: string,
  description: string,
  tags: string[],
): string | null {
  const src = `${title} ${description.slice(0, 400)} ${tags.join(" ")}`.toLowerCase()
  for (const t of THEMES) if (t.pattern.test(src)) return t.slug
  return null
}

export const THEME_MAP = new Map(THEMES.map((t) => [t.slug, t]))

export function themeLabel(slug: string | null): string {
  if (slug === null) return "ไม่เข้าธีมใด"
  return THEME_MAP.get(slug)?.label ?? slug
}

/**
 * Guards on how thin a cell may be before the UI stops showing a rate for it.
 * Cohort evidence is scarce by construction, so these are stated in the UI
 * rather than used to quietly drop rows.
 */
export const MIN_CELL_SIGNALS = 20
export const MIN_COHORT_SIGNALS = 50

/**
 * An over-index: this cohort's share of a category, against the same share
 * across every age-identified comment. 1.0 means exactly average. Using an
 * index rather than a raw share matters because Music and Entertainment
 * dominate every cohort's absolute counts — the index is what separates
 * "watches a lot of it" from "watches more of it than everyone else does".
 */
export function overIndex(
  cellSignals: number,
  cohortTotal: number,
  categoryTotal: number,
  grandTotal: number,
): number | null {
  if (cohortTotal === 0 || categoryTotal === 0 || grandTotal === 0) return null
  const cohortShareOfCategory = cellSignals / categoryTotal
  const cohortShareOverall = cohortTotal / grandTotal
  if (cohortShareOverall === 0) return null
  return cohortShareOfCategory / cohortShareOverall
}

/* ------------------------------------------------------------- shaping
 * View rows into what the page renders. Kept out of the page component so the
 * arithmetic — shares, indices, thin-cell guards — is in one place and can be
 * reasoned about without reading JSX.
 *
 * Every count is coerced with Number(): PostgREST returns sums over bigint
 * columns as strings, and "5" + "3" silently becoming "53" is the kind of bug
 * that produces a plausible-looking wrong chart.
 */
import type {
  MarketCategoryScale,
  MarketCohortCategory,
  MarketCohortFormat,
  MarketCohortTheme,
  MarketCohortTotal,
  MarketThemeScale,
} from "@/lib/types"

export interface ScaleRow {
  key: string
  label: string
  videos: number
  channels: number
  totalViews: number
  avgViews: number
  medianViews: number
  /** Share of the corpus's total views. */
  viewShare: number
  videoShare: number
  /** Share of this row's videos that are Shorts, or null when it has none. */
  shortsShare: number | null
}

export function categoryScaleRows(rows: MarketCategoryScale[]): ScaleRow[] {
  const totalViews = rows.reduce((a, r) => a + Number(r.total_views), 0)
  const totalVideos = rows.reduce((a, r) => a + Number(r.videos), 0)
  return rows
    .map((r) => {
      const videos = Number(r.videos)
      const shorts = Number(r.shorts)
      const longs = Number(r.longs)
      return {
        key: String(r.category_id ?? "none"),
        label: categoryLabel(r.category_id),
        videos,
        channels: Number(r.channels),
        totalViews: Number(r.total_views),
        avgViews: Number(r.avg_views),
        medianViews: Number(r.median_views),
        viewShare: totalViews > 0 ? (Number(r.total_views) / totalViews) * 100 : 0,
        videoShare: totalVideos > 0 ? (videos / totalVideos) * 100 : 0,
        shortsShare: shorts + longs > 0 ? (shorts / (shorts + longs)) * 100 : null,
      }
    })
    .sort((a, b) => b.totalViews - a.totalViews)
}

export function themeScaleRows(rows: MarketThemeScale[]): ScaleRow[] {
  const totalViews = rows.reduce((a, r) => a + Number(r.total_views), 0)
  const totalVideos = rows.reduce((a, r) => a + Number(r.videos), 0)
  return rows
    .map((r) => {
      const videos = Number(r.videos)
      const shorts = Number(r.shorts)
      const longs = Number(r.longs)
      return {
        key: r.theme ?? "none",
        label: themeLabel(r.theme),
        videos,
        channels: Number(r.channels),
        totalViews: Number(r.total_views),
        avgViews: Number(r.avg_views),
        medianViews: 0,
        viewShare: totalViews > 0 ? (Number(r.total_views) / totalViews) * 100 : 0,
        videoShare: totalVideos > 0 ? (videos / totalVideos) * 100 : 0,
        shortsShare: shorts + longs > 0 ? (shorts / (shorts + longs)) * 100 : null,
      }
    })
    .sort((a, b) => b.totalViews - a.totalViews)
}

export interface MatrixCell {
  key: string
  label: string
  signals: number
  /** Over-index against every age-identified comment. null when unstable. */
  index: number | null
  /** Too few signals to quote a rate for. The count is shown instead. */
  thin: boolean
}

export interface MatrixRow {
  band: CohortBand
  meta: CohortMeta
  signals: number
  statedAgeSignals: number
  avgStatedAge: number | null
  videos: number
  channels: number
  cells: MatrixCell[]
  /** The cells this cohort over-indexes on most, strongest first. */
  leans: MatrixCell[]
}

/**
 * Columns whose total across every cohort is too small to produce a single
 * readable cell. Rendering them fills the matrix with dashes and buries the
 * three or four columns that carry the finding, so they are dropped and the
 * count of what was dropped is reported instead.
 */
function usefulColumns<T extends { key: string; label: string }>(
  columns: T[],
  cells: { key: string; signals: number }[],
): { columns: T[]; dropped: number } {
  const totals = new Map<string, number>()
  for (const c of cells) {
    totals.set(c.key, (totals.get(c.key) ?? 0) + c.signals)
  }
  const kept = columns
    .filter((c) => (totals.get(c.key) ?? 0) >= MIN_CELL_SIGNALS)
    .sort((a, b) => (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0))
  return { columns: kept, dropped: columns.length - kept.length }
}

/** Columns are supplied so the same shaping serves categories and themes. */
function matrixRows(
  totals: MarketCohortTotal[],
  cells: { cohort: string; key: string; label: string; signals: number }[],
  columns: { key: string; label: string }[],
): MatrixRow[] {
  const totalByCohort = new Map(
    totals.map((t) => [t.cohort, Number(t.signals)]),
  )
  const grandTotal = [...totalByCohort.values()].reduce((a, b) => a + b, 0)

  const columnTotals = new Map<string, number>()
  for (const c of cells) {
    columnTotals.set(c.key, (columnTotals.get(c.key) ?? 0) + c.signals)
  }

  const byCohort = new Map<string, Map<string, number>>()
  for (const c of cells) {
    const m = byCohort.get(c.cohort) ?? new Map<string, number>()
    m.set(c.key, (m.get(c.key) ?? 0) + c.signals)
    byCohort.set(c.cohort, m)
  }

  return COHORTS.filter((meta) => totalByCohort.has(meta.band)).map((meta) => {
    const cohortTotal = totalByCohort.get(meta.band) ?? 0
    const row = byCohort.get(meta.band) ?? new Map<string, number>()
    const total = totals.find((t) => t.cohort === meta.band)

    const built: MatrixCell[] = columns.map((col) => {
      const signals = row.get(col.key) ?? 0
      const columnTotal = columnTotals.get(col.key) ?? 0
      const thin = signals < MIN_CELL_SIGNALS
      return {
        key: col.key,
        label: col.label,
        signals,
        index: thin
          ? null
          : overIndex(signals, cohortTotal, columnTotal, grandTotal),
        thin,
      }
    })

    return {
      band: meta.band,
      meta,
      signals: cohortTotal,
      statedAgeSignals: Number(total?.stated_age_signals ?? 0),
      avgStatedAge:
        total?.avg_stated_age === null || total?.avg_stated_age === undefined
          ? null
          : Number(total.avg_stated_age),
      videos: Number(total?.videos_touched ?? 0),
      channels: Number(total?.channels_touched ?? 0),
      cells: built,
      leans: built
        .filter((c) => !c.thin && c.index !== null && c.index > 1)
        .sort((a, b) => (b.index ?? 0) - (a.index ?? 0)),
    }
  })
}

/**
 * Cohort × YouTube category. The strongest read on the page, because the
 * column is metadata the uploader set rather than anything inferred from text.
 * Only categories that actually carry signals become columns — an all-zero
 * column is noise in a matrix this sparse.
 */
export function cohortCategoryMatrix(
  totals: MarketCohortTotal[],
  rows: MarketCohortCategory[],
): {
  rows: MatrixRow[]
  columns: { key: string; label: string }[]
  dropped: number
} {
  const present = new Set(
    rows.filter((r) => Number(r.signals) > 0).map((r) => String(r.category_id ?? "none")),
  )
  const all = CATEGORIES.filter((c) => present.has(String(c.id))).map((c) => ({
    key: String(c.id),
    label: c.label,
  }))
  const cells = rows.map((r) => ({
    cohort: r.cohort,
    key: String(r.category_id ?? "none"),
    label: categoryLabel(r.category_id),
    signals: Number(r.signals),
  }))
  const { columns, dropped } = usefulColumns(all, cells)
  return { rows: matrixRows(totals, cells, columns), columns, dropped }
}

/** Cohort × topic theme, for the granularity the 15 categories cannot express. */
export function cohortThemeMatrix(
  totals: MarketCohortTotal[],
  rows: MarketCohortTheme[],
): {
  rows: MatrixRow[]
  columns: { key: string; label: string }[]
  dropped: number
} {
  const present = new Set(
    rows.filter((r) => Number(r.signals) > 0).map((r) => r.theme ?? "none"),
  )
  const all = THEMES.filter((t) => present.has(t.slug)).map((t) => ({
    key: t.slug,
    label: t.label,
  }))
  const cells = rows.map((r) => ({
    cohort: r.cohort,
    key: r.theme ?? "none",
    label: themeLabel(r.theme),
    signals: Number(r.signals),
  }))
  const { columns, dropped } = usefulColumns(all, cells)
  return { rows: matrixRows(totals, cells, columns), columns, dropped }
}

export interface FormatRow {
  band: CohortBand
  label: string
  shorts: number
  longs: number
  shortsShare: number
  signals: number
}

/**
 * Shorts against long-form by age. The one behavioural split here that needs
 * no interpretation at all: duration is a fact about the video.
 */
export function formatRows(rows: MarketCohortFormat[]): FormatRow[] {
  const byCohort = new Map<string, { shorts: number; longs: number }>()
  for (const r of rows) {
    const cur = byCohort.get(r.cohort) ?? { shorts: 0, longs: 0 }
    if (r.format === "short") cur.shorts += Number(r.signals)
    else cur.longs += Number(r.signals)
    byCohort.set(r.cohort, cur)
  }
  return COHORTS.filter((c) => byCohort.has(c.band)).map((c) => {
    const v = byCohort.get(c.band)!
    const signals = v.shorts + v.longs
    return {
      band: c.band,
      label: c.label,
      shorts: v.shorts,
      longs: v.longs,
      shortsShare: signals > 0 ? (v.shorts / signals) * 100 : 0,
      signals,
    }
  })
}

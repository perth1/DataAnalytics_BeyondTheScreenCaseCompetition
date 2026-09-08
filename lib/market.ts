/**
 * Market analysis for GoyNattyDream.
 *
 * Two questions this answers, and how:
 *
 *   1. Where is the market? Audience demand is counted in comment signals and
 *      content supply in published posts. Both are scored by the SAME lexicon
 *      (supabase/migrations/0008), so the gap between demand share and supply
 *      share is a like-for-like read rather than two unrelated rankings.
 *
 *   2. What does each age group care about? Life-stage cohorts come from
 *      language the audience volunteers about itself, because measured age
 *      splits need the YouTube Analytics API, which only the channel owner can
 *      call (see 0003). Cohort cells are therefore small: every reader-facing
 *      number carries its n, and cells under MIN_CELL_SIGNALS are marked thin.
 */
import type {
  CohortSeries,
  CohortSlug,
  CohortTerritory,
  TerritoryDemand,
  TerritoryMomentum,
  TerritorySlug,
  TerritorySupply,
} from "@/lib/types"

export interface TerritoryMeta {
  slug: TerritorySlug
  label: string
  /** What the lexicon treats as belonging here, in the audience's own words. */
  note: string
  /**
   * A residual bucket whose markers are reactions rather than subject matter.
   * "ขำ", "สนุก", "ชอบมาก" attach to any video regardless of what it is about,
   * so its demand share measures affect, not an interest the channel could
   * publish more of — reading its demand-supply gap as white space is a
   * category error. Kept in the tables and the matrix, held out of the
   * opportunity headlines.
   */
  broad?: boolean
}

/** Display order matches the lexicon's match order in migration 0008. */
export const TERRITORIES: TerritoryMeta[] = [
  {
    slug: "longevity-wellness",
    label: "Longevity & Wellness",
    note: "สุขภาพ · ออกกำลังกาย · นอนไม่หลับ · อาหารเสริม · ป่วย · รักษา",
  },
  {
    slug: "self-development",
    label: "Self-development",
    note: "พัฒนาตัวเอง · แรงบันดาลใจ · ข้อคิด · มุมมอง · เป้าหมาย",
  },
  {
    slug: "money-career",
    label: "Money & Career",
    note: "ลงทุน · เก็บเงิน · หนี้ · ธุรกิจ · อาชีพ · รายได้",
  },
  {
    slug: "relationships",
    label: "Relationships",
    note: "ความรัก · แฟน · แต่งงาน · ครอบครัว · อกหัก · โสด",
  },
  {
    slug: "beauty-fashion",
    label: "Beauty & Fashion",
    note: "แต่งหน้า · เสื้อผ้า · ทรงผม · สกินแคร์ · ผิว",
  },
  { slug: "food", label: "Food & Dining", note: "ร้านอาหาร · เมนู · อร่อย · คาเฟ่" },
  {
    slug: "travel",
    label: "Travel",
    note: "เที่ยว · ทริป · ที่พัก · ต่างประเทศ · โรงแรม",
  },
  {
    slug: "entertainment",
    label: "Entertainment & Fandom",
    note: "ขำ · ตลก · สนุก · ติ่ง · เพลง · ซีรีส์ · เกม",
    broad: true,
  },
]

export interface CohortMeta {
  slug: CohortSlug
  label: string
  /** The age this life stage implies — inferred, never measured. */
  approxAge: string
  note: string
  /** True where the marker cannot pin an age on its own. */
  weak?: boolean
}

export const COHORTS: CohortMeta[] = [
  {
    slug: "teen",
    label: "Students (school)",
    approxAge: "13–19",
    note: "มัธยม · ปิดเทอม · การบ้าน · สอบเข้า",
  },
  {
    slug: "student-uni",
    label: "Students (university)",
    approxAge: "18–24",
    note: "มหาลัย · เฟรชชี่ · ฝึกงาน · จบใหม่",
  },
  {
    slug: "working",
    label: "Working age",
    approxAge: "25–39",
    note: "มนุษย์เงินเดือน · ออฟฟิศ · ที่ทำงาน · เจ้านาย",
  },
  {
    slug: "parent",
    label: "Parents",
    approxAge: "30–49",
    note: "ลูกสาว · ลูกชาย · สามี · แม่บ้าน · ท้อง",
  },
  {
    slug: "senior",
    label: "Older adults",
    approxAge: "50+",
    note: "ป้า · ยาย · หลาน · เกษียณ · วัยทอง",
  },
  {
    slug: "junior-voice",
    label: 'Speaks as junior ("หนู")',
    approxAge: "teens–20s",
    note: "Self-reference only — in Thai anyone may use it toward an elder",
    weak: true,
  },
]

/** Below this, a cohort × territory cell is too thin to index on. */
export const MIN_CELL_SIGNALS = 5

/**
 * A headline needs more evidence than a table cell. Ranking leans by index
 * alone promotes noise: a 5-signal cell can out-index a 21-signal one and
 * become the page's top claim on almost no evidence.
 */
export const MIN_HEADLINE_SIGNALS = 10

/** Post floor for an engagement-rate headline — a rate over 7 posts is noise. */
export const MIN_HEADLINE_POSTS = 10

export interface TerritoryRow {
  slug: TerritorySlug
  label: string
  note: string
  /** Residual reaction bucket — see TerritoryMeta.broad. */
  broad: boolean
  /** Demand: comment signals and their share of all territory signals. */
  signals: number
  demandShare: number
  postsMentioning: number
  signalLikes: number
  /** Supply: posts published in this territory and their share. */
  postCount: number
  supplyShare: number
  totalViews: number
  avgViews: number
  avgEngagementRate: number
  /** Demand share minus supply share. Positive means under-served. */
  gap: number
}

/**
 * Demand and supply on one row per territory.
 *
 * Supply shares are taken over CLASSIFIED posts only — 'unclassified' posts are
 * titled after a series or a guest, so counting them in the denominator would
 * make every territory look equally starved.
 */
export function territoryRows(
  demand: TerritoryDemand[],
  supply: TerritorySupply[],
): TerritoryRow[] {
  const demandBy = new Map<string, { signals: number; posts: number; likes: number }>()
  for (const d of demand) {
    const entry = demandBy.get(d.territory) ?? { signals: 0, posts: 0, likes: 0 }
    entry.signals += Number(d.signals)
    entry.posts += Number(d.posts_mentioning)
    entry.likes += Number(d.signal_likes)
    demandBy.set(d.territory, entry)
  }

  const supplyBy = new Map<
    string,
    { posts: number; views: number; likes: number; erWeighted: number }
  >()
  for (const s of supply) {
    if (s.territory === "unclassified") continue
    const entry =
      supplyBy.get(s.territory) ?? { posts: 0, views: 0, likes: 0, erWeighted: 0 }
    const posts = Number(s.post_count)
    entry.posts += posts
    entry.views += Number(s.total_views)
    entry.likes += Number(s.total_likes)
    // Post-weighted, so a platform with three posts cannot outvote one with 300.
    entry.erWeighted += Number(s.avg_engagement_rate) * posts
    supplyBy.set(s.territory, entry)
  }

  const totalSignals = [...demandBy.values()].reduce((s, d) => s + d.signals, 0)
  const totalPosts = [...supplyBy.values()].reduce((s, d) => s + d.posts, 0)

  return TERRITORIES.map((meta) => {
    const d = demandBy.get(meta.slug) ?? { signals: 0, posts: 0, likes: 0 }
    const s =
      supplyBy.get(meta.slug) ?? { posts: 0, views: 0, likes: 0, erWeighted: 0 }
    const demandShare = totalSignals > 0 ? (d.signals / totalSignals) * 100 : 0
    const supplyShare = totalPosts > 0 ? (s.posts / totalPosts) * 100 : 0

    return {
      slug: meta.slug,
      label: meta.label,
      note: meta.note,
      broad: meta.broad ?? false,
      signals: d.signals,
      demandShare,
      postsMentioning: d.posts,
      signalLikes: d.likes,
      postCount: s.posts,
      supplyShare,
      totalViews: s.views,
      avgViews: s.posts > 0 ? Math.round(s.views / s.posts) : 0,
      avgEngagementRate: s.posts > 0 ? s.erWeighted / s.posts : 0,
      gap: demandShare - supplyShare,
    }
  }).sort((a, b) => b.demandShare - a.demandShare)
}

export interface CohortCell {
  territory: TerritorySlug
  label: string
  signals: number
  /** Share of this cohort's own signals. */
  share: number
  /** Share relative to the all-cohort baseline. 1 = average, 2 = twice. */
  index: number
  /** n too small to read the index as anything but a hint. */
  thin: boolean
}

export interface CohortRow {
  meta: CohortMeta
  signals: number
  cells: CohortCell[]
  /** Territories this cohort over-indexes on, strongest first, thin cells out. */
  leans: CohortCell[]
  topSeries: { slug: string; name: string; signals: number }[]
}

/**
 * Cohort × territory as shares and indices against the pooled baseline.
 *
 * The index is what makes the table readable: every cohort talks about
 * entertainment most, so raw shares just repeat that. The index says what a
 * cohort talks about MORE than the audience as a whole.
 */
export function cohortRows(
  cohortTerritories: CohortTerritory[],
  series: CohortSeries[] = [],
): CohortRow[] {
  const byCohort = new Map<CohortSlug, Map<TerritorySlug, number>>()
  const baseline = new Map<TerritorySlug, number>()
  let baselineTotal = 0

  for (const row of cohortTerritories) {
    const signals = Number(row.signals)
    const territories = byCohort.get(row.cohort) ?? new Map()
    territories.set(row.territory, (territories.get(row.territory) ?? 0) + signals)
    byCohort.set(row.cohort, territories)
    baseline.set(row.territory, (baseline.get(row.territory) ?? 0) + signals)
    baselineTotal += signals
  }

  const seriesByCohort = new Map<CohortSlug, Map<string, { name: string; n: number }>>()
  for (const row of series) {
    const map = seriesByCohort.get(row.cohort) ?? new Map()
    const entry = map.get(row.series_slug) ?? { name: row.series_name, n: 0 }
    entry.n += Number(row.signals)
    map.set(row.series_slug, entry)
    seriesByCohort.set(row.cohort, map)
  }

  return COHORTS.filter((meta) => byCohort.has(meta.slug))
    .map((meta) => {
      const territories = byCohort.get(meta.slug)!
      const total = [...territories.values()].reduce((s, n) => s + n, 0)

      const cells: CohortCell[] = TERRITORIES.map((t) => {
        const signals = territories.get(t.slug) ?? 0
        const share = total > 0 ? (signals / total) * 100 : 0
        const baseShare =
          baselineTotal > 0
            ? ((baseline.get(t.slug) ?? 0) / baselineTotal) * 100
            : 0
        return {
          territory: t.slug,
          label: t.label,
          signals,
          share,
          index: baseShare > 0 ? share / baseShare : 0,
          thin: signals < MIN_CELL_SIGNALS,
        }
      })

      return {
        meta,
        signals: total,
        cells,
        leans: cells
          .filter((c) => !c.thin && c.index > 1.2)
          .sort((a, b) => b.index - a.index),
        topSeries: [...(seriesByCohort.get(meta.slug) ?? new Map()).entries()]
          .map(([slug, v]) => ({ slug, name: v.name, signals: v.n }))
          .sort((a, b) => b.signals - a.signals)
          .slice(0, 3),
      }
    })
    .sort((a, b) => b.signals - a.signals)
}

export interface MomentumYear {
  year: number
  /** Territory slug to its share of that year's signals. */
  shares: Record<string, number>
  signals: number
}

/**
 * Share of signals per year, not counts.
 *
 * Comment volume per year is driven by how much was published and how recently,
 * and the current year is always partial — so raw counts fall for every
 * territory at once. Share is what actually shows a subject gaining ground.
 */
export function momentumYears(
  rows: TerritoryMomentum[],
  fromYear: number,
): MomentumYear[] {
  const byYear = new Map<number, Map<string, number>>()
  for (const row of rows) {
    const year = Number(row.year)
    if (year < fromYear) continue
    const territories = byYear.get(year) ?? new Map()
    territories.set(
      row.territory,
      (territories.get(row.territory) ?? 0) + Number(row.signals),
    )
    byYear.set(year, territories)
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, territories]) => {
      const signals = [...territories.values()].reduce((s, n) => s + n, 0)
      const shares: Record<string, number> = {}
      for (const [slug, n] of territories) {
        shares[slug] = signals > 0 ? (n / signals) * 100 : 0
      }
      return { year, shares, signals }
    })
}

/** Change in share between the first and last year on record, per territory. */
export function momentumDelta(years: MomentumYear[]) {
  if (years.length < 2) return new Map<string, number>()
  const first = years[0]
  const last = years[years.length - 1]
  return new Map(
    TERRITORIES.map((t) => [
      t.slug,
      (last.shares[t.slug] ?? 0) - (first.shares[t.slug] ?? 0),
    ]),
  )
}

import type { PostCard, PostRow } from "@/lib/types"

export interface Totals {
  posts: number
  views: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
}

/** A platform with nothing ingested yet. */
export const EMPTY_TOTALS: Totals = {
  posts: 0,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  engagementRate: 0,
}

export function sumTotals(posts: PostRow[]): Totals {
  const totals = posts.reduce(
    (acc, p) => {
      acc.views += Number(p.views ?? 0)
      acc.likes += Number(p.likes ?? 0)
      acc.comments += Number(p.comments ?? 0)
      acc.shares += Number(p.shares ?? 0)
      return acc
    },
    { views: 0, likes: 0, comments: 0, shares: 0 },
  )

  return {
    posts: posts.length,
    ...totals,
    engagementRate:
      totals.views > 0
        ? ((totals.likes + totals.comments + totals.shares) / totals.views) * 100
        : 0,
  }
}

/**
 * A post's native format. YouTube is the one channel that publishes two very
 * different products under one handle — Shorts (<= 180s) and full-length clips —
 * so the labels stay in the subject's own vocabulary.
 */
const FORMAT_LABELS: Record<string, string> = {
  long: "คลิปปกติ",
  short: "Shorts",
  reel: "Reels",
  image: "โพสต์รูปภาพ",
  carousel: "อัลบั้มรูป (Carousel)",
  live: "ไลฟ์สด",
  text: "โพสต์ข้อความ",
}

const FORMAT_HINTS: Record<string, string> = {
  long: "ยาวกว่า 3 นาที",
  short: "ไม่เกิน 3 นาที",
}

export function formatLabel(key: string | null | undefined) {
  return FORMAT_LABELS[key ?? ""] ?? "ไม่ระบุรูปแบบ"
}

export function formatHint(key: string | null | undefined) {
  return FORMAT_HINTS[key ?? ""] ?? null
}

const sumViews = (posts: PostRow[]) =>
  posts.reduce((s, p) => s + Number(p.views ?? 0), 0)

export interface FormatGroup {
  key: string
  label: string
  posts: PostRow[]
}

/** Posts split by native format, the format with the most views first. */
export function groupByFormat(posts: PostRow[]): FormatGroup[] {
  const groups = new Map<string, PostRow[]>()
  for (const p of posts) {
    const key = p.format ?? "unknown"
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .map(([key, list]) => ({ key, label: formatLabel(key), posts: list }))
    .sort((a, b) => sumViews(b.posts) - sumViews(a.posts))
}

export interface FormatBucket {
  key: string
  label: string
  hint: string | null
  totals: Totals
  avgViews: number
  avgLikes: number
  avgComments: number
  viewShare: number
  postShare: number
}

/**
 * Per-format totals plus the two averages that actually separate a Shorts feed
 * from a long-form library: views per post and engagement per post. Totals
 * alone flatter whichever format is simply published more often.
 */
export function formatBreakdown(posts: PostRow[]): FormatBucket[] {
  const allViews = sumViews(posts)

  return groupByFormat(posts).map((g) => {
    const totals = sumTotals(g.posts)
    const per = (n: number) => (totals.posts > 0 ? Math.round(n / totals.posts) : 0)
    return {
      key: g.key,
      label: g.label,
      hint: formatHint(g.key),
      totals,
      avgViews: per(totals.views),
      avgLikes: per(totals.likes),
      avgComments: per(totals.comments),
      viewShare: allViews > 0 ? (totals.views / allViews) * 100 : 0,
      postShare: posts.length > 0 ? (totals.posts / posts.length) * 100 : 0,
    }
  })
}

export function formatSplit(posts: PostRow[]) {
  return formatBreakdown(posts).map((b) => ({
    label: b.label,
    posts: b.totals.posts,
    views: b.totals.views,
    share: b.viewShare,
  }))
}

/** Average views per post, bucketed by publish month. */
export function monthlyTimeline(posts: PostRow[]) {
  const buckets = new Map<string, { views: number; posts: number }>()

  for (const p of posts) {
    if (!p.published_at) continue
    const period = p.published_at.slice(0, 7)
    const bucket = buckets.get(period) ?? { views: 0, posts: 0 }
    bucket.views += Number(p.views ?? 0)
    bucket.posts += 1
    buckets.set(period, bucket)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      value: Math.round(b.views / b.posts),
      posts: b.posts,
    }))
}

export function topHashtags(posts: PostRow[], limit = 12) {
  const counts = new Map<string, { count: number; views: number }>()
  for (const p of posts) {
    for (const tag of p.hashtags ?? []) {
      const entry = counts.get(tag) ?? { count: 0, views: 0 }
      entry.count += 1
      entry.views += Number(p.views ?? 0)
      counts.set(tag, entry)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, limit)
    .map(([tag, v]) => ({ tag, ...v }))
}

export interface SeriesTop {
  slug: string
  name: string
  postCount: number
  totalViews: number
  top: PostCard[]
}

/**
 * Narrow a row to what a table renders.
 *
 * `SeriesTopList` and `TopContentTable` are client components, so whatever they
 * are handed is serialized into the HTML as RSC payload. Passing whole rows put
 * every unread field on the wire twice — once in the markup, once in the
 * payload — which is what made a platform page's HTML 785 kB.
 */
export function toCard(p: PostRow): PostCard {
  return {
    id: p.id,
    external_id: p.external_id,
    title: p.title,
    url: p.url,
    published_at: p.published_at,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    engagement_rate: p.engagement_rate,
    category_name: p.category_name,
    theme_name: p.theme_name,
  }
}

/**
 * Top N posts within every series, series ordered by total views.
 * Derived from the already-loaded post list so it costs no extra query.
 */
export function seriesTop(posts: PostRow[], limit = 10): SeriesTop[] {
  const groups = new Map<string, { name: string; posts: PostRow[] }>()

  for (const p of posts) {
    const slug = p.category_slug ?? "uncategorized"
    const group = groups.get(slug) ?? {
      name: p.category_name ?? "ยังไม่จัดหมวดหมู่",
      posts: [],
    }
    group.posts.push(p)
    groups.set(slug, group)
  }

  return [...groups.entries()]
    .map(([slug, g]) => ({
      slug,
      name: g.name,
      postCount: g.posts.length,
      totalViews: g.posts.reduce((s, p) => s + Number(p.views ?? 0), 0),
      top: [...g.posts]
        .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
        .slice(0, limit)
        .map(toCard),
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
}

export interface PerformanceAggregate {
  key: string
  name: string
  post_count: number
  total_views: number
  total_likes: number
  total_comments: number
  total_shares: number
  avg_views: number
  avg_engagement_rate: number
}

const DIMENSION_FALLBACK = {
  category: { slug: "uncategorized", name: "ยังไม่จัดหมวดหมู่" },
  theme: { slug: "unclassified", name: "ไม่ระบุธีม" },
} as const

/**
 * Series or theme performance computed from the posts already in memory.
 *
 * v_category_performance / v_theme_performance roll every format together, so
 * once the page is filtered to Shorts or long clips those views would
 * contradict the tiles above them. Slugs, fallback labels and the averaging
 * rule (mean of the per-post rate, not a ratio of the sums) mirror the SQL so
 * the unfiltered page reads identically to before.
 */
export function performanceBy(
  posts: PostRow[],
  dimension: "category" | "theme",
): PerformanceAggregate[] {
  const fallback = DIMENSION_FALLBACK[dimension]
  const groups = new Map<string, { name: string; posts: PostRow[] }>()

  for (const p of posts) {
    const slug =
      (dimension === "category" ? p.category_slug : p.theme_slug) ?? fallback.slug
    const name =
      (dimension === "category" ? p.category_name : p.theme_name) ?? fallback.name
    const group = groups.get(slug) ?? { name, posts: [] }
    group.posts.push(p)
    groups.set(slug, group)
  }

  return [...groups.entries()]
    .map(([slug, g]) => {
      const rates = g.posts
        .map((p) => p.engagement_rate)
        .filter((r): r is number => r !== null && r !== undefined)
      const sum = (pick: (p: PostRow) => number | null) =>
        g.posts.reduce((s, p) => s + Number(pick(p) ?? 0), 0)
      const totalViews = sum((p) => p.views)

      return {
        key: slug,
        name: g.name,
        post_count: g.posts.length,
        total_views: totalViews,
        total_likes: sum((p) => p.likes),
        total_comments: sum((p) => p.comments),
        total_shares: sum((p) => p.shares),
        avg_views: Math.round(totalViews / g.posts.length),
        avg_engagement_rate:
          rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0,
      }
    })
    .sort((a, b) => b.total_views - a.total_views)
}

export interface FormatSeries {
  key: string
  label: string
}

/** One month, with `<formatKey>` holding avg views and `<formatKey>__posts` the count. */
export interface FormatTimelineRow {
  period: string
  [series: string]: number | string | null
}

export interface FormatTimeline {
  series: FormatSeries[]
  data: FormatTimelineRow[]
}

/**
 * Average views per post per month, one line per format.
 *
 * A month with no post of a given format gets null rather than 0 so the line
 * bridges the gap instead of diving to the axis — a format that simply wasn't
 * published is not a format that flopped.
 */
export function monthlyTimelineByFormat(
  posts: PostRow[],
  limit = 2,
): FormatTimeline {
  const groups = groupByFormat(posts).slice(0, limit)
  const periods = new Set<string>()
  const byFormat = new Map<string, Map<string, { views: number; posts: number }>>()

  for (const g of groups) {
    const buckets = new Map<string, { views: number; posts: number }>()
    for (const p of g.posts) {
      if (!p.published_at) continue
      const period = p.published_at.slice(0, 7)
      periods.add(period)
      const bucket = buckets.get(period) ?? { views: 0, posts: 0 }
      bucket.views += Number(p.views ?? 0)
      bucket.posts += 1
      buckets.set(period, bucket)
    }
    byFormat.set(g.key, buckets)
  }

  const data = [...periods]
    .sort((a, b) => a.localeCompare(b))
    .map((period) => {
      const row: FormatTimelineRow = { period }
      for (const g of groups) {
        const bucket = byFormat.get(g.key)?.get(period)
        row[g.key] = bucket ? Math.round(bucket.views / bucket.posts) : null
        row[`${g.key}__posts`] = bucket?.posts ?? 0
      }
      return row
    })

  return { series: groups.map((g) => ({ key: g.key, label: g.label })), data }
}

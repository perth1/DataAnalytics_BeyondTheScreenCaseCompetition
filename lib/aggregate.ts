import type { PostWithMetrics } from "@/lib/types"

export interface Totals {
  posts: number
  views: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
}

export function sumTotals(posts: PostWithMetrics[]): Totals {
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

const FORMAT_LABELS: Record<string, string> = {
  long: "Long-form video",
  short: "Shorts",
  reel: "Reels",
  image: "Image post",
  carousel: "Carousel",
  live: "Live",
  text: "Text post",
}

export function formatSplit(posts: PostWithMetrics[]) {
  const buckets = new Map<string, { posts: number; views: number }>()
  for (const p of posts) {
    const key = p.format ?? "unknown"
    const bucket = buckets.get(key) ?? { posts: 0, views: 0 }
    bucket.posts += 1
    bucket.views += Number(p.views ?? 0)
    buckets.set(key, bucket)
  }

  const totalViews = [...buckets.values()].reduce((s, b) => s + b.views, 0)

  return [...buckets.entries()]
    .map(([key, b]) => ({
      label: FORMAT_LABELS[key] ?? "Unclassified",
      posts: b.posts,
      views: b.views,
      share: totalViews > 0 ? (b.views / totalViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
}

/** Average views per post, bucketed by publish month. */
export function monthlyTimeline(posts: PostWithMetrics[]) {
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

export function topHashtags(posts: PostWithMetrics[], limit = 12) {
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

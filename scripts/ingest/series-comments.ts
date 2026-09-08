/**
 * Pulls comments for the top N posts of every series, then writes them straight
 * to Supabase. This is the set whose comments get read and summarised, so the
 * comment corpus follows the "Top 10 by series" table in the UI rather than a
 * single channel-wide view threshold.
 *
 *   npm run ingest:series-comments
 *   npm run ingest:series-comments -- --top 10 --comments-per-video 100
 *   npm run ingest:series-comments -- --series music,travel
 *   npm run ingest:series-comments -- --dry
 *
 * Needs YOUTUBE_API_KEY and SUPABASE_SERVICE_ROLE_KEY. Posts that already have
 * comments stored are skipped unless --refetch is passed.
 */
import { loadEnv, requireEnv } from "../../lib/env"

loadEnv()

import { createAdminClient } from "../../lib/supabase/server"
import { getComments } from "../../lib/youtube"

const args = process.argv.slice(2)
function flag(name: string) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
function num(name: string, fallback: number) {
  const v = flag(name)
  return v === undefined ? fallback : Number(v)
}

const platform = flag("platform") ?? "youtube"
const topN = num("top", 10)
const perVideo = num("comments-per-video", 200)
const onlySeries = flag("series")?.split(",").map((s) => s.trim())
const dryRun = args.includes("--dry")
const refetch = args.includes("--refetch")

const PAGE = 1000

interface Row {
  id: string
  external_id: string
  title: string | null
  views: number | null
  comments: number | null
  category_slug: string | null
  category_name: string | null
}

async function loadPosts(db: ReturnType<typeof createAdminClient>) {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("v_post_latest_metrics")
      .select(
        "id, external_id, title, views, comments, category_slug, category_name",
      )
      .eq("platform", platform)
      .order("external_id")
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < PAGE) break
  }
  return rows
}

/** Post ids that already have comments stored, paged past the 1000-row cap. */
async function loadCommentedPostIds(db: ReturnType<typeof createAdminClient>) {
  const ids = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("post_comments")
      .select("post_id")
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const row of data ?? []) ids.add(row.post_id as string)
    if (!data || data.length < PAGE) break
  }
  return ids
}

async function main() {
  requireEnv("YOUTUBE_API_KEY")
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  const db = createAdminClient()

  const posts = await loadPosts(db)
  console.log(`Loaded ${posts.length} ${platform} posts`)

  const bySeries = new Map<string, Row[]>()
  for (const p of posts) {
    const slug = p.category_slug ?? "uncategorized"
    if (onlySeries && !onlySeries.includes(slug)) continue
    const list = bySeries.get(slug) ?? []
    list.push(p)
    bySeries.set(slug, list)
  }

  const targets: Row[] = []
  for (const [, list] of bySeries) {
    list.sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
    targets.push(...list.slice(0, topN))
  }
  // A post can only appear once even if two series ever overlap.
  const seen = new Set<string>()
  const unique = targets.filter((p) => !seen.has(p.id) && seen.add(p.id))

  const done = refetch ? new Set<string>() : await loadCommentedPostIds(db)
  const queue = unique.filter(
    (p) => !done.has(p.id) && Number(p.comments ?? 0) > 0,
  )

  console.log(
    `${bySeries.size} series -> ${unique.length} target posts; ` +
      `${unique.length - queue.length} already stored or comment-free; ` +
      `${queue.length} to fetch`,
  )
  if (dryRun) {
    for (const p of queue) {
      console.log(
        `  ${String(p.views ?? 0).padStart(10)}  ${p.category_slug}  ${p.title?.slice(0, 60)}`,
      )
    }
    return
  }

  let fetched = 0
  let written = 0

  for (const [i, post] of queue.entries()) {
    const comments = await getComments(post.external_id, perVideo)
    fetched += 1
    if (comments.length === 0) {
      console.log(
        `  skip  ${post.category_slug}  ${post.title?.slice(0, 56)} (none returned)`,
      )
      continue
    }

    const rows = comments.map((c) => ({
      post_id: post.id,
      external_id: c.id,
      author: c.author,
      text: c.text,
      like_count: c.likeCount,
      published_at: c.publishedAt,
    }))

    const { error } = await db
      .from("post_comments")
      .upsert(rows, { onConflict: "post_id,external_id" })
    if (error) throw error
    written += rows.length

    console.log(
      `  ${String(i + 1).padStart(3)}/${queue.length}  ` +
        `${String(rows.length).padStart(4)} comments  ` +
        `${post.category_slug}  ${post.title?.slice(0, 48)}`,
    )
  }

  console.log(`\nFetched ${fetched} videos, wrote ${written} comments.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

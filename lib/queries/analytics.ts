import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { cachedRead } from "@/lib/cache"
import type {
  CategoryPerformance,
  ThemePerformance,
  Channel,
  CommentSummary,
  Platform,
  PostRow,
} from "@/lib/types"
import type { Totals } from "@/lib/aggregate"

async function readChannels(): Promise<Channel[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("channels")
    .select("*")
    .order("platform")
  return data ?? []
}

async function readChannel(platform: Platform): Promise<Channel | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await createServerClient()
    .from("channels")
    .select("*")
    .eq("platform", platform)
    .maybeSingle()
  return data ?? null
}

const PAGE = 1000

/**
 * The columns behind `PostRow`. Named rather than `*` because the view also
 * carries `description`, `thumbnail_url` and the `raw` API response, and on a
 * read of every post those were most of the megabyte crossing the wire.
 */
const POST_COLUMNS =
  "id,external_id,platform,title,url,published_at,format,hashtags,is_viral," +
  "category_slug,category_name,theme_slug,theme_name," +
  "views,likes,comments,shares,engagement_rate"

/**
 * Every post for a platform. PostgREST caps a single response at 1000 rows, so
 * this reads a count first and then pulls all the pages at once — paging in
 * sequence meant each 1000-row hop waited on the one before it.
 */
async function readPosts(platform: Platform): Promise<PostRow[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()

  const { count, error: countError } = await db
    .from("v_post_latest_metrics")
    .select("id", { count: "exact", head: true })
    .eq("platform", platform)
  if (countError) throw countError
  if (!count) return []

  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / PAGE) }, (_, i) =>
      db
        .from("v_post_latest_metrics")
        .select(POST_COLUMNS)
        .eq("platform", platform)
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range(i * PAGE, i * PAGE + PAGE - 1),
    ),
  )

  const rows: PostRow[] = []
  for (const page of pages) {
    if (page.error) throw page.error
    rows.push(...((page.data ?? []) as unknown as PostRow[]))
  }
  return rows
}

/**
 * Platform-level totals without reading a single post.
 *
 * The overview page needs six numbers per platform and used to load every post
 * row of every platform to add them up. `v_category_performance` already has
 * the sums grouped by series, and its groups partition the platform, so adding
 * the groups back up gives the same answer for a few kilobytes.
 */
async function readPlatformTotals(): Promise<Record<string, Totals>> {
  const rows = await readCategoryPerformance()
  const byPlatform: Record<string, Totals> = {}

  for (const row of rows) {
    const t = (byPlatform[row.platform] ??= {
      posts: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagementRate: 0,
    })
    t.posts += Number(row.post_count)
    t.views += Number(row.total_views)
    t.likes += Number(row.total_likes)
    t.comments += Number(row.total_comments)
    t.shares += Number(row.total_shares)
  }

  for (const t of Object.values(byPlatform)) {
    t.engagementRate =
      t.views > 0 ? ((t.likes + t.comments + t.shares) / t.views) * 100 : 0
  }
  return byPlatform
}

async function readTopPosts(
  platform: Platform,
  limit = 20,
): Promise<PostRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_post_latest_metrics")
    .select(POST_COLUMNS)
    .eq("platform", platform)
    .order("views", { ascending: false, nullsFirst: false })
    .limit(limit)
  return (data ?? []) as unknown as PostRow[]
}

async function readCategoryPerformance(
  platform?: Platform,
): Promise<CategoryPerformance[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_category_performance")
    .select("*")
    .order("total_views", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return data ?? []
}

async function readThemePerformance(
  platform?: Platform,
): Promise<ThemePerformance[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_theme_performance")
    .select("*")
    .order("total_views", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return data ?? []
}

async function readCommentSummaries(
  platform: Platform,
): Promise<(CommentSummary & { post: PostRow })[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("comment_summaries")
    .select("*, post:posts!inner(id,external_id,platform,title,url,published_at,format)")
    .eq("post.platform", platform)
    .order("generated_at", { ascending: false })
  return (data ?? []) as (CommentSummary & { post: PostRow })[]
}

export interface ViralPostRow {
  id: string
  title: string | null
  url: string
  views: number | null
  comments: number | null
  ingestedComments: number
  summary: CommentSummary | null
}

/**
 * Mass-reach posts with their ingested comment count and any Claude summary.
 * `format` narrows to one native format (YouTube Shorts vs long clips) so the
 * comment insights match whatever the page is filtered to.
 */
async function readViralPosts(
  platform: Platform,
  limit = 12,
  format?: string,
): Promise<ViralPostRow[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()

  let viralQuery = db
    .from("v_post_latest_metrics")
    .select("id, title, url, views, comments")
    .eq("platform", platform)
    .eq("is_viral", true)
  if (format) viralQuery = viralQuery.eq("format", format)

  const { data: posts } = await viralQuery
    .order("views", { ascending: false, nullsFirst: false })
    .limit(limit)

  if (!posts || posts.length === 0) return []
  const ids = posts.map((p) => p.id).filter((id): id is string => Boolean(id))

  const [{ data: summaries }, { data: commentRows }] = await Promise.all([
    db.from("comment_summaries").select("*").in("post_id", ids),
    db.from("post_comments").select("post_id").in("post_id", ids),
  ])

  const summaryByPost = new Map(
    (summaries ?? []).map((s) => [s.post_id, s as unknown as CommentSummary]),
  )
  const counts = new Map<string, number>()
  for (const row of commentRows ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1)
  }

  return posts.map((p) => ({
    id: p.id as string,
    title: p.title,
    url: p.url as string,
    views: p.views,
    comments: p.comments,
    ingestedComments: counts.get(p.id as string) ?? 0,
    summary: summaryByPost.get(p.id as string) ?? null,
  }))
}

/** Post ids on this platform that already have a Claude comment summary. */
async function readSummarisedPostIds(
  platform: Platform,
): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("comment_summaries")
    .select("post_id, post:posts!inner(platform)")
    .eq("post.platform", platform)
  return (data ?? []).map((row) => row.post_id as string)
}

/** Get a comment summary by post id. */
async function readSummarySummary(
  postId: string,
): Promise<CommentSummary | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await createServerClient()
    .from("comment_summaries")
    .select("*")
    .eq("post_id", postId)
    .maybeSingle()
  return (data as unknown as CommentSummary) ?? null
}

export interface DataSnapshot {
  /** When the metrics on screen were captured. */
  capturedAt: string | null
  firstPost: string | null
  lastPost: string | null
}

/**
 * When the data was pulled and what period it covers.
 *
 * Read from the rows rather than hardcoded, so the source note on the site
 * stays true after the next ingest instead of quietly going stale. All three
 * are limit-1 reads on indexed columns.
 */
async function readDataSnapshot(): Promise<DataSnapshot> {
  if (!isSupabaseConfigured())
    return { capturedAt: null, firstPost: null, lastPost: null }
  const db = createServerClient()

  const [captured, first, last] = await Promise.all([
    db
      .from("post_metrics")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("posts")
      .select("published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from("posts")
      .select("published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    capturedAt: captured.data?.captured_at ?? null,
    firstPost: first.data?.published_at ?? null,
    lastPost: last.data?.published_at ?? null,
  }
}

/**
 * Cached reads.
 *
 * Nothing above changes on a page view — the numbers move only when an ingest
 * script runs — so each read is memoised behind the ingest tag rather than
 * re-run for every visitor. `readPlatformTotals` is wrapped separately from the
 * `readCategoryPerformance` it builds on, since the derived shape is what the
 * page wants and re-summing it per request buys nothing.
 */
export const getChannels = cachedRead("channels", readChannels)
export const getChannel = cachedRead("channel", readChannel)
export const getPosts = cachedRead("posts", readPosts)
export const getPlatformTotals = cachedRead("platform-totals", readPlatformTotals)
export const getTopPosts = cachedRead("top-posts", readTopPosts)
export const getCategoryPerformance = cachedRead(
  "category-performance",
  readCategoryPerformance,
)
export const getThemePerformance = cachedRead(
  "theme-performance",
  readThemePerformance,
)
export const getCommentSummaries = cachedRead(
  "comment-summaries",
  readCommentSummaries,
)
export const getViralPosts = cachedRead("viral-posts", readViralPosts)
export const getSummarisedPostIds = cachedRead(
  "summarised-post-ids",
  readSummarisedPostIds,
)
export const getSummarySummary = cachedRead("summary", readSummarySummary)
export const getDataSnapshot = cachedRead("data-snapshot", readDataSnapshot)

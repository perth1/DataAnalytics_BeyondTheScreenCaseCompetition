import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type {
  CategoryPerformance,
  ThemePerformance,
  Channel,
  CommentSummary,
  Platform,
  PostWithMetrics,
} from "@/lib/types"

export async function getChannels(): Promise<Channel[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("channels")
    .select("*")
    .order("platform")
  return data ?? []
}

export async function getChannel(platform: Platform): Promise<Channel | null> {
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
 * Every post for a platform. PostgREST caps a single response at 1000 rows,
 * so page until the tail comes back short.
 */
export async function getPosts(platform: Platform): Promise<PostWithMetrics[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const rows: PostWithMetrics[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("v_post_latest_metrics")
      .select("*")
      .eq("platform", platform)
      .order("published_at", { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as PostWithMetrics[]))
    if (!data || data.length < PAGE) break
  }

  return rows
}

export async function getTopPosts(
  platform: Platform,
  limit = 20,
): Promise<PostWithMetrics[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_post_latest_metrics")
    .select("*")
    .eq("platform", platform)
    .order("views", { ascending: false, nullsFirst: false })
    .limit(limit)
  return data ?? []
}

export async function getCategoryPerformance(
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

export async function getThemePerformance(
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

export async function getCommentSummaries(
  platform: Platform,
): Promise<(CommentSummary & { post: PostWithMetrics })[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("comment_summaries")
    .select("*, post:posts!inner(*)")
    .eq("post.platform", platform)
    .order("generated_at", { ascending: false })
  return (data ?? []) as (CommentSummary & { post: PostWithMetrics })[]
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

/** Mass-reach posts with their ingested comment count and any Claude summary. */
export async function getViralPosts(
  platform: Platform,
  limit = 12,
): Promise<ViralPostRow[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()

  const { data: posts } = await db
    .from("v_post_latest_metrics")
    .select("id, title, url, views, comments")
    .eq("platform", platform)
    .eq("is_viral", true)
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
export async function getSummarisedPostIds(
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
export async function getSummarySummary(
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

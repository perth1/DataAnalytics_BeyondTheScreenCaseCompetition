export type Platform = "youtube" | "tiktok" | "facebook" | "instagram"

export type PostFormat =
  | "long"
  | "short"
  | "reel"
  | "image"
  | "carousel"
  | "live"
  | "text"

export type DocumentKind = "gdoc" | "gsheet" | "gslide" | "link" | "pdf"

export type Sentiment = "positive" | "neutral" | "negative" | "mixed"

export interface Channel {
  id: string
  platform: Platform
  handle: string
  display_name: string
  channel_url: string
  external_id: string | null
  followers: number | null
  created_at: string
}

export interface ContentCategory {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
}

export interface Post {
  id: string
  channel_id: string
  platform: Platform
  external_id: string
  url: string
  title: string | null
  description: string | null
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds: number | null
  format: PostFormat | null
  category_id: string | null
  hashtags: string[] | null
  is_viral: boolean
  raw: Record<string, unknown> | null
}

export interface PostMetrics {
  id: string
  post_id: string
  captured_at: string
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  engagement_rate: number | null
}

export interface PostComment {
  id: string
  post_id: string
  external_id: string | null
  author: string | null
  text: string
  like_count: number | null
  published_at: string | null
  sentiment: Sentiment | null
}

export interface CommentSummary {
  id: string
  post_id: string
  model: string
  summary: string
  themes: { label: string; share: number; example: string | null }[] | null
  sentiment_breakdown: Record<Sentiment, number> | null
  audience_signals: string[] | null
  content_requests: string[] | null
  comment_count: number
  generated_at: string
}

/** Post joined with its latest metrics snapshot and category. */
export interface PostWithMetrics extends Post {
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  engagement_rate: number | null
  category_slug: string | null
  category_name: string | null
  theme_slug: string | null
  theme_name: string | null
}

/**
 * The post columns the analytics pages actually read.
 *
 * `v_post_latest_metrics` also carries `description`, `thumbnail_url`, `raw`
 * and every join key. Nothing on the site renders them, but `select("*")` still
 * paid for them: on a read of all 2.3k posts they were most of the payload.
 * Queries name these columns explicitly, so this — not `PostWithMetrics` — is
 * the shape the aggregation works from.
 */
export type PostRow = Pick<
  PostWithMetrics,
  | "id"
  | "external_id"
  | "platform"
  | "title"
  | "url"
  | "published_at"
  | "format"
  | "hashtags"
  | "is_viral"
  | "category_slug"
  | "category_name"
  | "theme_slug"
  | "theme_name"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "engagement_rate"
>

/**
 * The fields a post table renders. Narrower than `PostRow` because these rows
 * cross into client components, where every unread field is bytes of RSC
 * payload in the HTML and nothing else.
 */
export type PostCard = Pick<
  PostRow,
  | "id"
  | "external_id"
  | "title"
  | "url"
  | "published_at"
  | "views"
  | "likes"
  | "comments"
  | "engagement_rate"
  | "category_name"
  | "theme_name"
>

export interface ThemePerformance {
  platform: Platform
  theme_slug: string
  theme_name: string
  post_count: number
  total_views: number
  total_likes: number
  total_comments: number
  total_shares: number
  avg_views: number
  avg_engagement_rate: number
}

export interface CategoryPerformance {
  platform: Platform
  category_slug: string
  category_name: string
  post_count: number
  total_views: number
  total_likes: number
  total_comments: number
  total_shares: number
  avg_views: number
  avg_engagement_rate: number
}

export interface DocumentRef {
  id: string
  title: string
  kind: DocumentKind
  url: string
  google_file_id: string | null
  description: string | null
  tags: string[] | null
  sort_order: number
  updated_at: string
}

export interface PlanBoard {
  id: string
  title: string
  framework: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface PlanCard {
  id: string
  board_id: string
  column_key: string
  title: string
  body: string | null
  sort_order: number
  created_at: string
}

/** Interest territory and life-stage cohort slugs — see supabase/migrations/0008. */
export type TerritorySlug =
  | "longevity-wellness"
  | "self-development"
  | "money-career"
  | "relationships"
  | "beauty-fashion"
  | "food"
  | "travel"
  | "entertainment"

export type CohortSlug =
  | "teen"
  | "student-uni"
  | "working"
  | "parent"
  | "senior"
  | "junior-voice"

/** Audience demand for a territory, counted in comment signals. */
export interface TerritoryDemand {
  platform: Platform
  territory: TerritorySlug
  signals: number
  posts_mentioning: number
  signal_likes: number
}

/** Content supply for a territory, counted in published posts. */
export interface TerritorySupply {
  platform: Platform
  territory: TerritorySlug | "unclassified"
  post_count: number
  total_views: number
  total_likes: number
  total_comments: number
  avg_views: number
  avg_engagement_rate: number
}

export interface CohortTerritory {
  platform: Platform
  cohort: CohortSlug
  territory: TerritorySlug
  signals: number
  signal_likes: number
}

export interface CohortSeries {
  platform: Platform
  cohort: CohortSlug
  series_slug: string
  series_name: string
  signals: number
}

export interface TerritoryMomentum {
  platform: Platform
  territory: TerritorySlug
  year: number
  signals: number
}

export interface SignalCoverage {
  platform: Platform
  comments: number
  cohort_signals: number
  territory_signals: number
  posts_with_comments: number
}

/* ------------------------------------------------- thai audience market
 * Rows from the views in migration 0011. Counts arrive from PostgREST as
 * numbers, but sums over bigint columns can come back as strings, so the
 * shaping helpers in lib/thai-market.ts coerce with Number() rather than
 * trusting these to be numeric.
 */

export interface MarketCoverage {
  videos: number
  channels: number
  comments: number
  cohort_signals: number
  stated_age_signals: number
  life_stage_signals: number
  parent_signals: number
  corpus_views: number
  earliest_video: string | null
  latest_video: string | null
  fetched_at: string | null
}

export interface MarketCategoryScale {
  category_id: number | null
  videos: number
  channels: number
  total_views: number
  avg_views: number
  median_views: number
  total_likes: number
  total_comments: number
  shorts: number
  longs: number
}

export interface MarketThemeScale {
  theme: string | null
  videos: number
  channels: number
  total_views: number
  avg_views: number
  shorts: number
  longs: number
}

export interface MarketCohortTotal {
  cohort: string
  signals: number
  stated_age_signals: number
  parent_signals: number
  avg_stated_age: number | null
  videos_touched: number
  channels_touched: number
}

export interface MarketCohortCategory {
  cohort: string
  category_id: number | null
  signals: number
  videos: number
  signal_likes: number | null
}

export interface MarketCohortTheme {
  cohort: string
  theme: string | null
  signals: number
  videos: number
}

export interface MarketCohortFormat {
  cohort: string
  format: string
  signals: number
}

export interface MarketChannelReach {
  channel_id: string
  channel_title: string | null
  subscribers: number | null
  country: string | null
  videos_in_corpus: number
  corpus_views: number
  avg_views: number
  main_category: number | null
}

export interface MarketCohortVideo {
  cohort: string
  video_id: string
  video_title: string | null
  channel_title: string | null
  category_id: number | null
  theme: string | null
  views: number
  cohort_signals: number
}

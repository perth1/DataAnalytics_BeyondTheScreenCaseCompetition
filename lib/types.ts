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

import { ExternalLink, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCompact, formatDate, formatPercent } from "@/lib/utils"
import type { CommentSummary } from "@/lib/types"

export interface ViralPost {
  id: string
  title: string | null
  url: string
  views: number | null
  comments: number | null
  ingestedComments: number
  summary: CommentSummary | null
}

const SENTIMENT_ORDER = ["positive", "neutral", "mixed", "negative"] as const
const SENTIMENT_RAMP: Record<string, string> = {
  positive: "var(--chart-1)",
  neutral: "var(--chart-3)",
  mixed: "var(--chart-2)",
  negative: "var(--chart-4)",
}

function SentimentBar({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = SENTIMENT_ORDER.map((k) => ({
    key: k,
    value: Number(breakdown[k] ?? 0),
  })).filter((e) => e.value > 0)
  const total = entries.reduce((s, e) => s + e.value, 0) || 1

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
        {entries.map((e) => (
          <div
            key={e.key}
            style={{
              width: `${(e.value / total) * 100}%`,
              background: SENTIMENT_RAMP[e.key],
            }}
            className="first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {entries.map((e) => (
          <span key={e.key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: SENTIMENT_RAMP[e.key] }}
            />
            <span className="capitalize">{e.key}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatPercent(e.value, 0)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function SummaryBody({ summary }: { summary: CommentSummary }) {
  const themes = (summary.themes ?? []).slice(0, 6)

  return (
    <div className="space-y-5 border-t px-5 py-5">
      <p className="text-sm leading-relaxed">{summary.summary}</p>

      {summary.sentiment_breakdown && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Sentiment</p>
          <SentimentBar
            breakdown={summary.sentiment_breakdown as unknown as Record<string, number>}
          />
        </div>
      )}

      {themes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Themes</p>
          <div className="space-y-2.5">
            {themes.map((theme) => (
              <div key={theme.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium">{theme.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatPercent(theme.share, 0)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{ width: `${Math.min(Math.max(theme.share, 1), 100)}%` }}
                  />
                </div>
                {theme.example && (
                  <p className="text-muted-foreground border-l pl-2.5 text-xs italic">
                    {theme.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {(summary.audience_signals ?? []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Audience signals</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {summary.audience_signals!.map((s) => (
                <li key={s} className="flex gap-1.5">
                  <span>—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(summary.content_requests ?? []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">What viewers ask for next</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {summary.content_requests!.map((s) => (
                <li key={s} className="flex gap-1.5">
                  <span>—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {summary.comment_count} comments analysed · {summary.model} ·{" "}
        {formatDate(summary.generated_at)}
      </p>
    </div>
  )
}

function PostCard({ post }: { post: ViralPost }) {
  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0 space-y-1.5">
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-1.5 text-sm font-medium"
          >
            <span className="group-hover:underline">
              {post.title ?? "(untitled)"}
            </span>
            <ExternalLink className="text-muted-foreground mt-0.5 size-3 shrink-0" />
          </a>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span className="tabular-nums">{formatCompact(post.views)} views</span>
            <span>·</span>
            <span className="tabular-nums">
              {formatCompact(post.comments)} comments
            </span>
            <Badge variant="muted">{post.ingestedComments} collected</Badge>
          </div>
        </div>
        {!post.summary && (
          <Badge variant="outline">Awaiting analysis</Badge>
        )}
      </div>

      {post.summary && <SummaryBody summary={post.summary} />}
      {!post.summary && post.ingestedComments === 0 && (
        <p className="text-muted-foreground border-t px-5 py-3 text-xs">
          No comments collected for this post.
        </p>
      )}
    </div>
  )
}

export function CommentInsights({ posts }: { posts: ViralPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
        <MessageSquare className="text-muted-foreground size-5" />
        <p className="text-sm font-medium">No mass-reach content flagged yet</p>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          Posts in the top view decile with enough comments appear here once
          the platform has been ingested.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

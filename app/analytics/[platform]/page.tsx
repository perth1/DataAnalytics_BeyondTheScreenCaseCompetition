import { notFound } from "next/navigation"
import { Activity, ExternalLink } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import { CategoryBar } from "@/components/analytics/category-bar"
import { PerformanceTable } from "@/components/analytics/performance-table"
import { TimelineChart } from "@/components/analytics/timeline-chart"
import { FormatSplit } from "@/components/analytics/format-split"
import { TopContentTable } from "@/components/analytics/top-content-table"
import { SeriesTopList } from "@/components/analytics/series-top-list"
import { CommentInsights } from "@/components/analytics/comment-insights"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  getCategoryPerformance,
  getChannel,
  getPosts,
  getSummarisedPostIds,
  getThemePerformance,
  getViralPosts,
} from "@/lib/queries/analytics"
import {
  formatSplit,
  monthlyTimeline,
  seriesTop,
  sumTotals,
  topHashtags,
} from "@/lib/aggregate"
import { PLATFORM_MAP, PLATFORMS } from "@/lib/constants"
import { formatCompact, formatPercent } from "@/lib/utils"
import type { Platform } from "@/lib/types"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return PLATFORMS.map((p) => ({ platform: p.key }))
}

export default async function PlatformAnalyticsPage({
  params,
}: {
  params: Promise<{ platform: string }>
}) {
  const { platform } = await params
  const meta = PLATFORM_MAP[platform as Platform]
  if (!meta) notFound()

  const [channel, posts, categories, themes, viral, summarised] =
    await Promise.all([
      getChannel(meta.key),
      getPosts(meta.key),
      getCategoryPerformance(meta.key),
      getThemePerformance(meta.key),
      getViralPosts(meta.key),
      getSummarisedPostIds(meta.key),
    ])

  const totals = sumTotals(posts)
  const timeline = monthlyTimeline(posts)
  const formats = formatSplit(posts)
  const hashtags = topHashtags(posts)
  const topPosts = [...posts]
    .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
    .slice(0, 20)
  const seriesGroups = seriesTop(posts, 10)

  const categoryChart = categories
    .map((c) => ({
      name: c.category_name,
      value: Number(c.total_views),
      posts: Number(c.post_count),
    }))
    .slice(0, 10)

  const themeChart = themes
    .map((t) => ({
      name: t.theme_name,
      value: Number(t.total_views),
      posts: Number(t.post_count),
    }))
    .slice(0, 10)

  return (
    <PageShell
      title={meta.label}
      description={meta.handle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PlatformNav />
          <a
            href={meta.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Channel <ExternalLink />
          </a>
        </div>
      }
    >
      {posts.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={`No ${meta.label} data ingested`}
          description={
            meta.key === "youtube"
              ? "Run npm run ingest:youtube -- --comments to pull videos, metrics, and comments."
              : `Export ${meta.label} content performance to CSV, then run npm run ingest:csv -- --platform ${meta.key} --file <path>.`
          }
        />
      ) : (
        <div className="space-y-8">
          <StatRow>
            <StatTile
              label={meta.key === "youtube" ? "Subscribers" : "Followers"}
              value={formatCompact(channel?.followers)}
            />
            <StatTile label="Posts" value={formatCompact(totals.posts)} />
            <StatTile label="Views" value={formatCompact(totals.views)} />
            <StatTile label="Likes" value={formatCompact(totals.likes)} />
            <StatTile label="Comments" value={formatCompact(totals.comments)} />
            <StatTile
              label="Engagement rate"
              value={formatPercent(totals.engagementRate)}
              sub="(likes + comments + shares) / views"
            />
          </StatRow>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Average views per post"
              caption="By publish month"
            >
              <TimelineChart data={timeline} />
            </ChartFrame>
            <ChartFrame
              title="Views by format"
              caption="Share of total views"
            >
              <FormatSplit data={formats} />
            </ChartFrame>
          </div>

          {themeChart.length > 0 && (
            <ChartFrame
              title="Views by theme"
              caption="What the content is about — assigned per post by Claude"
            >
              <CategoryBar data={themeChart} />
            </ChartFrame>
          )}

          {themes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Theme performance
              </h2>
              <div className="rounded-xl border">
                <PerformanceTable
                  label="Theme"
                  rows={themes.map((t) => ({ ...t, key: t.theme_slug, name: t.theme_name }))}
                />
              </div>
            </section>
          )}

          {categoryChart.length > 0 && (
            <ChartFrame
              title="Views by series"
              caption={`${meta.label} programmes, top ${categoryChart.length}`}
            >
              <CategoryBar data={categoryChart} />
            </ChartFrame>
          )}

          {categories.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Series performance
              </h2>
              <div className="rounded-xl border">
                <PerformanceTable
                  label="Series"
                  rows={categories.map((c) => ({ ...c, key: c.category_slug, name: c.category_name }))}
                />
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                Top 10 by series
              </h2>
              <p className="text-muted-foreground text-xs">
                Pick a programme to see its ten most-viewed posts. These are the
                clips whose comments get read and summarised.
              </p>
            </div>
            <SeriesTopList groups={seriesGroups} analysed={summarised} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Top content</h2>
            <div className="rounded-xl border">
              <TopContentTable posts={topPosts} />
            </div>
          </section>

          {hashtags.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Hashtags by reach
              </h2>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((h) => (
                  <Badge key={h.tag} variant="outline">
                    {h.tag}
                    <span className="text-muted-foreground tabular-nums">
                      {formatCompact(h.views)}
                    </span>
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                Comment insights
              </h2>
              <p className="text-muted-foreground text-xs">
                Claude reads the ingested comments on mass-reach content and reports
                themes, sentiment, audience signals, and requests.
              </p>
            </div>
            <CommentInsights posts={viral} />
          </section>
        </div>
      )}
    </PageShell>
  )
}

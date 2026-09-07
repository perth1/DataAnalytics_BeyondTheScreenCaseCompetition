import Link from "next/link"
import { Activity, ArrowUpRight } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import { CategoryBar } from "@/components/analytics/category-bar"
import { CategoryTable } from "@/components/analytics/category-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { getCategoryPerformance, getPosts } from "@/lib/queries/analytics"
import { sumTotals } from "@/lib/aggregate"
import { BRAND, PLATFORMS } from "@/lib/constants"
import { formatCompact, formatPercent } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const perPlatform = await Promise.all(
    PLATFORMS.map(async (platform) => ({
      platform,
      totals: sumTotals(await getPosts(platform.key, 1000)),
    })),
  )

  const categories = await getCategoryPerformance()
  const grand = perPlatform.reduce(
    (acc, p) => ({
      posts: acc.posts + p.totals.posts,
      views: acc.views + p.totals.views,
      likes: acc.likes + p.totals.likes,
      comments: acc.comments + p.totals.comments,
      shares: acc.shares + p.totals.shares,
    }),
    { posts: 0, views: 0, likes: 0, comments: 0, shares: 0 },
  )
  const grandEr =
    grand.views > 0
      ? ((grand.likes + grand.comments + grand.shares) / grand.views) * 100
      : 0

  const hasData = grand.posts > 0

  // Cross-platform totals are combined here; each platform keeps its own chart.
  const combinedCategories = Object.values(
    categories.reduce<Record<string, { name: string; value: number; posts: number }>>(
      (acc, row) => {
        const entry = acc[row.category_slug] ?? {
          name: row.category_name,
          value: 0,
          posts: 0,
        }
        entry.value += Number(row.total_views)
        entry.posts += Number(row.post_count)
        acc[row.category_slug] = entry
        return acc
      },
      {},
    ),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <PageShell
      title="Analytics"
      description={`${BRAND.subject} — content and audience performance across platforms`}
      actions={<PlatformNav />}
    >
      {!hasData ? (
        <EmptyState
          icon={Activity}
          title="No data ingested yet"
          description="Run npm run ingest:youtube to populate posts, metrics, and comments. TikTok, Instagram, and Facebook load from creator exports via npm run ingest:csv."
        />
      ) : (
        <div className="space-y-8">
          <StatRow>
            <StatTile label="Posts" value={formatCompact(grand.posts)} />
            <StatTile label="Views" value={formatCompact(grand.views)} />
            <StatTile label="Likes" value={formatCompact(grand.likes)} />
            <StatTile label="Comments" value={formatCompact(grand.comments)} />
            <StatTile label="Shares" value={formatCompact(grand.shares)} />
            <StatTile label="Engagement rate" value={formatPercent(grandEr)} />
          </StatRow>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perPlatform.map(({ platform, totals }) => (
              <Link
                key={platform.key}
                href={`/analytics/${platform.key}`}
                className="hover:bg-muted/40 rounded-xl border p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{platform.label}</span>
                  {platform.primary ? (
                    <Badge variant="muted">Primary</Badge>
                  ) : (
                    <ArrowUpRight className="text-muted-foreground size-3.5" />
                  )}
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatCompact(totals.views)}
                </p>
                <p className="text-muted-foreground text-xs">total views</p>
                <dl className="text-muted-foreground mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt>Posts</dt>
                    <dd className="tabular-nums">{formatCompact(totals.posts)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Engagement rate</dt>
                    <dd className="tabular-nums">
                      {formatPercent(totals.engagementRate)}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>

          {combinedCategories.length > 0 && (
            <ChartFrame
              title="Views by content category"
              caption="All platforms combined, top 10 categories"
            >
              <CategoryBar data={combinedCategories} />
            </ChartFrame>
          )}

          {categories.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Category performance by platform
              </h2>
              <div className="rounded-xl border">
                <CategoryTable rows={categories} />
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}

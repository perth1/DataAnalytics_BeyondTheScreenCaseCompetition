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
import { DataSources } from "@/components/analytics/data-sources"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  getCategoryPerformance,
  getChannel,
  getDataSnapshot,
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

  const [channel, posts, categories, themes, viral, summarised, snapshot] =
    await Promise.all([
      getChannel(meta.key),
      getPosts(meta.key),
      getCategoryPerformance(meta.key),
      getThemePerformance(meta.key),
      getViralPosts(meta.key),
      getSummarisedPostIds(meta.key),
      getDataSnapshot(),
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
            ช่องทาง <ExternalLink />
          </a>
        </div>
      }
    >
      {posts.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={`ยังไม่มีข้อมูล ${meta.label}`}
          description={
            meta.key === "youtube"
              ? "รัน npm run ingest:youtube -- --comments เพื่อดึงวิดีโอ ยอดสถิติ และคอมเมนต์"
              : `ส่งออกข้อมูลผลงาน ${meta.label} เป็น CSV แล้วรัน npm run ingest:csv -- --platform ${meta.key} --file <path>`
          }
        />
      ) : (
        <div className="space-y-8">
          <StatRow>
            <StatTile
              label={meta.key === "youtube" ? "ผู้ติดตาม (Subscribers)" : "ผู้ติดตาม (Followers)"}
              value={formatCompact(channel?.followers)}
            />
            <StatTile label="โพสต์" value={formatCompact(totals.posts)} />
            <StatTile label="ยอดวิว" value={formatCompact(totals.views)} />
            <StatTile label="ไลก์" value={formatCompact(totals.likes)} />
            <StatTile label="คอมเมนต์" value={formatCompact(totals.comments)} />
            <StatTile
              label="อัตราการมีส่วนร่วม (Engagement rate)"
              value={formatPercent(totals.engagementRate)}
              sub="(ไลก์ + คอมเมนต์ + แชร์) / ยอดวิว"
            />
          </StatRow>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title="ยอดวิวเฉลี่ยต่อโพสต์"
              caption="แบ่งตามเดือนที่เผยแพร่"
            >
              <TimelineChart data={timeline} />
            </ChartFrame>
            <ChartFrame
              title="ยอดวิวแบ่งตามรูปแบบ"
              caption="สัดส่วนของยอดวิวรวม"
            >
              <FormatSplit data={formats} />
            </ChartFrame>
          </div>

          {themeChart.length > 0 && (
            <ChartFrame
              title="ยอดวิวแบ่งตามธีม"
              caption="เนื้อหาเกี่ยวกับอะไร — จัดหมวดหมู่รายโพสต์โดย Claude"
            >
              <CategoryBar data={themeChart} />
            </ChartFrame>
          )}

          {themes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                ผลงานแบ่งตามธีม
              </h2>
              <div className="rounded-xl border">
                <PerformanceTable
                  label="ธีม"
                  rows={themes.map((t) => ({ ...t, key: t.theme_slug, name: t.theme_name }))}
                />
              </div>
            </section>
          )}

          {categoryChart.length > 0 && (
            <ChartFrame
              title="ยอดวิวแบ่งตามซีรีส์"
              caption={`รายการของ ${meta.label} อันดับสูงสุด ${categoryChart.length} รายการ`}
            >
              <CategoryBar data={categoryChart} />
            </ChartFrame>
          )}

          {categories.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                ผลงานแบ่งตามซีรีส์
              </h2>
              <div className="rounded-xl border">
                <PerformanceTable
                  label="ซีรีส์"
                  rows={categories.map((c) => ({ ...c, key: c.category_slug, name: c.category_name }))}
                />
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                10 อันดับสูงสุดแบ่งตามซีรีส์
              </h2>
              <p className="text-muted-foreground text-xs">
                เลือกรายการเพื่อดูโพสต์ที่มียอดวิวสูงสุด 10 อันดับ นี่คือคลิปที่
                คอมเมนต์ถูกอ่านและสรุปผลแล้ว
              </p>
            </div>
            <SeriesTopList groups={seriesGroups} analysed={summarised} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">เนื้อหายอดนิยม</h2>
            <div className="rounded-xl border">
              <TopContentTable posts={topPosts} />
            </div>
          </section>

          {hashtags.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                แฮชแท็กแบ่งตามการเข้าถึง
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
                ข้อมูลเชิงลึกจากคอมเมนต์
              </h2>
              <p className="text-muted-foreground text-xs">
                Claude อ่านคอมเมนต์ที่จัดเก็บไว้ของเนื้อหาที่มีการเข้าถึงสูง
                แล้วสรุปประเด็นหลัก ความรู้สึกของผู้ชม สัญญาณจากผู้ชม และคำขอต่างๆ
              </p>
            </div>
            <CommentInsights posts={viral} />
          </section>

          <DataSources snapshot={snapshot} coverage={{ posts: totals.posts }} />
        </div>
      )}
    </PageShell>
  )
}

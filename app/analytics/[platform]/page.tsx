import { notFound } from "next/navigation"
import { Activity, ExternalLink } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { FormatNav } from "@/components/analytics/format-nav"
import { FormatCompare } from "@/components/analytics/format-compare"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import {
  CategoryBar,
  FormatTimelineChart,
  TimelineChart,
} from "@/components/analytics/lazy-charts"
import { PerformanceTable } from "@/components/analytics/performance-table"
import { FormatSplit } from "@/components/analytics/format-split"
import { TopContentTable } from "@/components/analytics/top-content-table"
import { SeriesTopList } from "@/components/analytics/series-top-list"
import { CommentInsights } from "@/components/analytics/comment-insights"
import { DataSources } from "@/components/analytics/data-sources"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  getChannel,
  getDataSnapshot,
  getPosts,
  getSummarisedPostIds,
  getViralPosts,
} from "@/lib/queries/analytics"
import {
  formatBreakdown,
  formatHint,
  formatLabel,
  formatSplit,
  monthlyTimeline,
  monthlyTimelineByFormat,
  performanceBy,
  seriesTop,
  sumTotals,
  toCard,
  topHashtags,
} from "@/lib/aggregate"
import { PLATFORM_MAP, PLATFORMS, POST_FORMATS } from "@/lib/constants"
import { formatCompact, formatPercent } from "@/lib/utils"
import type { Platform, PostFormat } from "@/lib/types"

// Not force-dynamic: the reads behind this page are cached, so a request with
// no ?format= can be served from the prerender the build produced for each
// platform in generateStaticParams. Matches READ_TTL in lib/cache.ts, which a
// segment config cannot import.
export const revalidate = 300

export function generateStaticParams() {
  return PLATFORMS.map((p) => ({ platform: p.key }))
}

export default async function PlatformAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>
  searchParams: Promise<{ format?: string | string[] }>
}) {
  const { platform } = await params
  const meta = PLATFORM_MAP[platform as Platform]
  if (!meta) notFound()

  const requested = (await searchParams).format
  const candidate = Array.isArray(requested) ? requested[0] : requested
  // Guarded against the enum, not against what happens to be in the data: the
  // same value has to be safe to hand to a Postgres `format = ?` filter.
  const activeFormat = POST_FORMATS.includes(candidate as PostFormat)
    ? (candidate as PostFormat)
    : null

  const [channel, allPosts, viral, summarised, snapshot] = await Promise.all([
    getChannel(meta.key),
    getPosts(meta.key),
    getViralPosts(meta.key, 12, activeFormat ?? undefined),
    getSummarisedPostIds(meta.key),
    getDataSnapshot(),
  ])

  const breakdown = formatBreakdown(allPosts)
  const formatOptions = breakdown.map((b) => ({
    key: b.key,
    label: b.label,
    posts: b.totals.posts,
  }))
  // Shorts and long clips are different products under one handle, so the
  // channel's numbers only mean something once they are kept apart.
  const splitByFormat = formatOptions.length > 1
  const posts = activeFormat
    ? allPosts.filter((p) => p.format === activeFormat)
    : allPosts

  const totals = sumTotals(posts)
  const timeline = monthlyTimeline(posts)
  const formatTimeline = monthlyTimelineByFormat(allPosts, 2)
  const formats = formatSplit(allPosts)
  const hashtags = topHashtags(posts)
  // Narrowed to the rendered fields: the table below is a client component, so
  // whatever it is handed is serialized into the HTML a second time as RSC
  // payload.
  const topPosts = [...posts]
    .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
    .slice(0, 20)
    .map(toCard)
  const seriesGroups = seriesTop(posts, 10)
  const categories = performanceBy(posts, "category")
  const themes = performanceBy(posts, "theme")

  const categoryChart = categories
    .map((c) => ({ name: c.name, value: c.total_views, posts: c.post_count }))
    .slice(0, 10)

  const themeChart = themes
    .map((t) => ({ name: t.name, value: t.total_views, posts: t.post_count }))
    .slice(0, 10)

  const scope = activeFormat ? formatLabel(activeFormat) : null
  const scopeHint = activeFormat ? formatHint(activeFormat) : null
  const scopeSuffix = scope ? ` · ${scope}` : ""

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
      {allPosts.length === 0 ? (
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
          {splitByFormat && (
            <div className="space-y-2">
              <FormatNav
                basePath={`/analytics/${meta.key}`}
                options={formatOptions}
                active={activeFormat ?? "all"}
                total={allPosts.length}
              />
              <p className="text-muted-foreground text-xs">
                {scope
                  ? `ทุกตัวเลขด้านล่างนับเฉพาะ ${scope}${scopeHint ? ` (${scopeHint})` : ""} เท่านั้น`
                  : "ตัวเลขด้านล่างรวมทุกรูปแบบ เลือกแท็บเพื่อดูแยก Shorts กับคลิปปกติ"}
              </p>
            </div>
          )}

          {posts.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={`ยังไม่มี ${scope ?? "เนื้อหา"} บน ${meta.label}`}
              description="เลือกแท็บ ทั้งหมด เพื่อดูรูปแบบที่ช่องนี้เผยแพร่จริง"
            />
          ) : (
            <>
              <StatRow>
                <StatTile
                  label={
                    meta.key === "youtube"
                      ? "ผู้ติดตาม (Subscribers)"
                      : "ผู้ติดตาม (Followers)"
                  }
                  value={formatCompact(channel?.followers)}
                  sub={scope ? "ระดับช่อง ไม่แยกรูปแบบ" : undefined}
                />
                <StatTile
                  label={`โพสต์${scopeSuffix}`}
                  value={formatCompact(totals.posts)}
                />
                <StatTile
                  label={`ยอดวิว${scopeSuffix}`}
                  value={formatCompact(totals.views)}
                />
                <StatTile label="ไลก์" value={formatCompact(totals.likes)} />
                <StatTile label="คอมเมนต์" value={formatCompact(totals.comments)} />
                <StatTile
                  label="อัตราการมีส่วนร่วม (Engagement rate)"
                  value={formatPercent(totals.engagementRate)}
                  sub="(ไลก์ + คอมเมนต์ + แชร์) / ยอดวิว"
                />
              </StatRow>

              {splitByFormat && !activeFormat ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartFrame
                      title="ยอดวิวเฉลี่ยต่อโพสต์"
                      caption={`แบ่งตามเดือนที่เผยแพร่ · แยก ${formatTimeline.series
                        .map((s) => s.label)
                        .join(" กับ ")}`}
                    >
                      <FormatTimelineChart
                        data={formatTimeline.data}
                        series={formatTimeline.series}
                      />
                    </ChartFrame>
                    <ChartFrame
                      title="ยอดวิวแบ่งตามรูปแบบ"
                      caption="สัดส่วนของยอดวิวรวม"
                    >
                      <FormatSplit data={formats} />
                    </ChartFrame>
                  </div>

                  <section className="space-y-3">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold tracking-tight">
                        {breakdown.map((b) => b.label).join(" เทียบกับ ")}
                      </h2>
                      <p className="text-muted-foreground text-xs">
                        ยอดรวมเข้าข้างรูปแบบที่เผยแพร่ถี่กว่า ค่าเฉลี่ยต่อโพสต์
                        จึงเป็นตัวบอกว่าแต่ละรูปแบบทำงานได้ดีแค่ไหน
                      </p>
                    </div>
                    <div className="rounded-xl border">
                      <FormatCompare buckets={breakdown} />
                    </div>
                  </section>
                </>
              ) : (
                <ChartFrame
                  title={`ยอดวิวเฉลี่ยต่อโพสต์${scopeSuffix}`}
                  caption="แบ่งตามเดือนที่เผยแพร่"
                >
                  <TimelineChart data={timeline} />
                </ChartFrame>
              )}

              {themeChart.length > 0 && (
                <ChartFrame
                  title={`ยอดวิวแบ่งตามธีม${scopeSuffix}`}
                  caption="เนื้อหาเกี่ยวกับอะไร — จัดหมวดหมู่รายโพสต์โดย Claude"
                >
                  <CategoryBar data={themeChart} />
                </ChartFrame>
              )}

              {themes.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-tight">
                    ผลงานแบ่งตามธีม{scopeSuffix}
                  </h2>
                  <div className="rounded-xl border">
                    <PerformanceTable label="ธีม" rows={themes} />
                  </div>
                </section>
              )}

              {categoryChart.length > 0 && (
                <ChartFrame
                  title={`ยอดวิวแบ่งตามซีรีส์${scopeSuffix}`}
                  caption={`รายการของ ${meta.label} อันดับสูงสุด ${categoryChart.length} รายการ`}
                >
                  <CategoryBar data={categoryChart} />
                </ChartFrame>
              )}

              {categories.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-tight">
                    ผลงานแบ่งตามซีรีส์{scopeSuffix}
                  </h2>
                  <div className="rounded-xl border">
                    <PerformanceTable label="ซีรีส์" rows={categories} />
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold tracking-tight">
                    10 อันดับสูงสุดแบ่งตามซีรีส์{scopeSuffix}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    เลือกรายการเพื่อดูโพสต์ที่มียอดวิวสูงสุด 10 อันดับ นี่คือคลิปที่
                    คอมเมนต์ถูกอ่านและสรุปผลแล้ว
                  </p>
                </div>
                <SeriesTopList groups={seriesGroups} analysed={summarised} />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  เนื้อหายอดนิยม{scopeSuffix}
                </h2>
                <div className="rounded-xl border">
                  <TopContentTable posts={topPosts} />
                </div>
              </section>

              {hashtags.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-tight">
                    แฮชแท็กแบ่งตามการเข้าถึง{scopeSuffix}
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
                    ข้อมูลเชิงลึกจากคอมเมนต์{scopeSuffix}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Claude อ่านคอมเมนต์ที่จัดเก็บไว้ของเนื้อหาที่มีการเข้าถึงสูง
                    แล้วสรุปประเด็นหลัก ความรู้สึกของผู้ชม สัญญาณจากผู้ชม และคำขอต่างๆ
                  </p>
                </div>
                <CommentInsights posts={viral} />
              </section>

              <DataSources snapshot={snapshot} coverage={{ posts: totals.posts }} />
            </>
          )}
        </div>
      )}
    </PageShell>
  )
}

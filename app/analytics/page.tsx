import Link from "next/link"
import { Activity, ArrowUpRight } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import { CategoryBar } from "@/components/analytics/category-bar"
import { PerformanceTable } from "@/components/analytics/performance-table"
import { DataSources } from "@/components/analytics/data-sources"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  getCategoryPerformance,
  getDataSnapshot,
  getPosts,
  getThemePerformance,
} from "@/lib/queries/analytics"
import { sumTotals } from "@/lib/aggregate"
import { BRAND, PLATFORMS } from "@/lib/constants"
import { formatCompact, formatPercent } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const perPlatform = await Promise.all(
    PLATFORMS.map(async (platform) => ({
      platform,
      totals: sumTotals(await getPosts(platform.key)),
    })),
  )

  const [categories, themes, snapshot] = await Promise.all([
    getCategoryPerformance(),
    getThemePerformance(),
    getDataSnapshot(),
  ])
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

  const combinedThemes = Object.values(
    themes.reduce<Record<string, { name: string; value: number; posts: number }>>(
      (acc, row) => {
        const entry = acc[row.theme_slug] ?? {
          name: row.theme_name,
          value: 0,
          posts: 0,
        }
        entry.value += Number(row.total_views)
        entry.posts += Number(row.post_count)
        acc[row.theme_slug] = entry
        return acc
      },
      {},
    ),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <PageShell
      title="ภาพรวมทุกแพลตฟอร์ม"
      description={`${BRAND.subject} — ผลงานคอนเทนต์และผู้ชมรวมทุกแพลตฟอร์ม`}
      actions={<PlatformNav />}
    >
      {!hasData ? (
        <EmptyState
          icon={Activity}
          title="ยังไม่มีข้อมูลนำเข้า"
          description="รัน npm run ingest:youtube เพื่อดึงโพสต์ ยอดสถิติ และคอมเมนต์ ส่วน TikTok, Instagram และ Facebook นำเข้าจากไฟล์ CSV ที่ส่งออกจากหลังบ้านด้วย npm run ingest:csv"
        />
      ) : (
        <div className="space-y-8">
          <StatRow>
            <StatTile label="โพสต์" value={formatCompact(grand.posts)} />
            <StatTile label="ยอดวิว" value={formatCompact(grand.views)} />
            <StatTile label="ไลก์" value={formatCompact(grand.likes)} />
            <StatTile label="คอมเมนต์" value={formatCompact(grand.comments)} />
            <StatTile label="แชร์" value={formatCompact(grand.shares)} />
            <StatTile
              label="อัตราการมีส่วนร่วม (ER)"
              value={formatPercent(grandEr)}
            />
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
                    <Badge variant="muted">ช่องทางหลัก</Badge>
                  ) : (
                    <ArrowUpRight className="text-muted-foreground size-3.5" />
                  )}
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatCompact(totals.views)}
                </p>
                <p className="text-muted-foreground text-xs">ยอดวิวรวม</p>
                <dl className="text-muted-foreground mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt>โพสต์</dt>
                    <dd className="tabular-nums">{formatCompact(totals.posts)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>อัตราการมีส่วนร่วม</dt>
                    <dd className="tabular-nums">
                      {formatPercent(totals.engagementRate)}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>

          {combinedThemes.length > 0 && (
            <ChartFrame
              title="ยอดวิวแบ่งตามธีม"
              caption="รวมทุกแพลตฟอร์ม 10 ธีมสูงสุด"
            >
              <CategoryBar data={combinedThemes} />
            </ChartFrame>
          )}

          {combinedCategories.length > 0 && (
            <ChartFrame
              title="ยอดวิวแบ่งตามซีรีส์"
              caption="รวมทุกแพลตฟอร์ม 10 รายการสูงสุด"
            >
              <CategoryBar data={combinedCategories} />
            </ChartFrame>
          )}

          {categories.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                ผลงานซีรีส์แยกตามแพลตฟอร์ม
              </h2>
              <div className="rounded-xl border">
                <PerformanceTable
                  label="ซีรีส์"
                  rows={categories.map((c) => ({
                    ...c,
                    key: `${c.platform}-${c.category_slug}`,
                    name: `${c.category_name}`,
                  }))}
                />
              </div>
            </section>
          )}

          <DataSources
            snapshot={snapshot}
            coverage={{ posts: grand.posts }}
          />
        </div>
      )}
    </PageShell>
  )
}

"use client"

import { useState } from "react"
import { ChevronDown, ExternalLink, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCompact, formatDate, formatPercent } from "@/lib/utils"
import { fetchCommentSummary } from "@/app/actions/summary"
import type { SeriesTop } from "@/lib/aggregate"
import type { CommentSummary } from "@/lib/types"

interface SeriesTopListProps {
  groups: SeriesTop[]
  /** Post ids that already have a Claude comment summary. */
  analysed?: string[]
}

export function SeriesTopList({ groups, analysed = [] }: SeriesTopListProps) {
  const [slug, setSlug] = useState(groups[0]?.slug ?? "")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [summary, setSummary] = useState<CommentSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const active = groups.find((g) => g.slug === slug) ?? groups[0]
  const done = new Set(analysed)

  const handleRowClick = async (postId: string) => {
    if (!done.has(postId)) return
    setSelectedPostId(postId)
    setLoading(true)
    try {
      const summary = await fetchCommentSummary(postId)
      setSummary(summary)
    } finally {
      setLoading(false)
    }
  }

  if (!active) return null

  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="relative">
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-label="ซีรีส์"
            className="bg-background focus-visible:ring-ring/50 h-9 w-full min-w-[16rem] appearance-none rounded-md border pr-9 pl-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {groups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name} — {g.postCount} โพสต์
              </option>
            ))}
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
        </div>
        <dl className="text-muted-foreground flex gap-5 text-xs">
          <div>
            <dt className="inline">โพสต์ </dt>
            <dd className="text-foreground inline font-medium tabular-nums">
              {formatCompact(active.postCount)}
            </dd>
          </div>
          <div>
            <dt className="inline">ยอดวิวรวม </dt>
            <dd className="text-foreground inline font-medium tabular-nums">
              {formatCompact(active.totalViews)}
            </dd>
          </div>
          <div>
            <dt className="inline">แสดงอันดับสูงสุด </dt>
            <dd className="text-foreground inline font-medium tabular-nums">
              {active.top.length}
            </dd>
          </div>
        </dl>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>เนื้อหา</TableHead>
            <TableHead>ธีม</TableHead>
            <TableHead className="text-right">ยอดวิว</TableHead>
            <TableHead className="text-right">ไลก์</TableHead>
            <TableHead className="text-right">คอมเมนต์</TableHead>
            <TableHead className="text-right">อัตราการมีส่วนร่วม (ER)</TableHead>
            <TableHead className="text-right">วันที่เผยแพร่</TableHead>
            <TableHead className="text-right">การวิเคราะห์คอมเมนต์</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.top.map((post, i) => (
            <TableRow
              key={post.id}
              className={done.has(post.id) ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => handleRowClick(post.id)}
            >
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell className="max-w-[340px]">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="line-clamp-2 group-hover:underline">
                    {post.title ?? post.external_id}
                  </span>
                  <ExternalLink className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                </a>
              </TableCell>
              <TableCell>
                <Badge variant="muted">{post.theme_name ?? "ยังไม่จัดหมวดหมู่"}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCompact(post.views)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCompact(post.likes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCompact(post.comments)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(post.engagement_rate)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                {formatDate(post.published_at)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={done.has(post.id) ? "secondary" : "outline"}>
                  {done.has(post.id) ? "วิเคราะห์แล้ว" : "รอดำเนินการ"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b bg-muted/50 px-6 py-4">
              <h2 className="text-lg font-semibold">การวิเคราะห์คอมเมนต์</h2>
              <button
                onClick={() => {
                  setSelectedPostId(null)
                  setSummary(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center px-6 py-12">
                <p className="text-muted-foreground">กำลังโหลดข้อมูลสรุป...</p>
              </div>
            ) : summary ? (
              <div className="space-y-6 px-6 py-6">
                <div>
                  <p className="text-sm leading-relaxed">{summary.summary}</p>
                </div>

                {summary.sentiment_breakdown && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">ความรู้สึกของผู้ชม (Sentiment)</p>
                    <SentimentBar
                      breakdown={summary.sentiment_breakdown as Record<string, number>}
                    />
                  </div>
                )}

                {(summary.themes ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">ประเด็นหลักที่พูดถึง</p>
                    <div className="space-y-2.5">
                      {summary.themes!.map((theme) => (
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
                              style={{
                                width: `${Math.min(Math.max(theme.share, 1), 100)}%`,
                              }}
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
                      <p className="text-xs font-semibold">สัญญาณจากผู้ชม</p>
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
                      <p className="text-xs font-semibold">สิ่งที่ผู้ชมอยากเห็นต่อไป</p>
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
                  วิเคราะห์จาก {summary.comment_count} คอมเมนต์ · {summary.model} ·{" "}
                  {formatDate(summary.generated_at)}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center px-6 py-12">
                <p className="text-muted-foreground">ยังไม่มีข้อมูลสรุปสำหรับโพสต์นี้</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SentimentBar({ breakdown }: { breakdown: Record<string, number> }) {
  const SENTIMENT_ORDER = ["positive", "neutral", "mixed", "negative"] as const
  const SENTIMENT_RAMP: Record<string, string> = {
    positive: "var(--chart-1)",
    neutral: "var(--chart-3)",
    mixed: "var(--chart-2)",
    negative: "var(--chart-4)",
  }
  const SENTIMENT_LABEL: Record<string, string> = {
    positive: "เชิงบวก",
    neutral: "เป็นกลาง",
    mixed: "ผสม",
    negative: "เชิงลบ",
  }

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
            <span>{SENTIMENT_LABEL[e.key] ?? e.key}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatPercent(e.value, 0)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

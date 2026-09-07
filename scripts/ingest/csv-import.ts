/**
 * CSV import for TikTok, Instagram, and Facebook, which have no public API for
 * content that belongs to someone else's account. Export from the creator or
 * business tools, then:
 *
 *   npm run ingest:csv -- --platform tiktok --file data/raw/tiktok.csv
 *
 * Writes .sql files to data/raw/<platform>-<date>/ — no Supabase credential
 * is used. Apply them in filename order.
 *
 * Recognised headers (case and space insensitive, first match wins):
 *   external id  : id, video_id, post_id, permalink, url, link
 *   url          : url, link, permalink, post_url
 *   title        : title, caption, description, name, video_title, message
 *   published    : published, date, publish_time, post_time, created_time
 *   views        : views, video_views, plays, impressions, reach
 *   likes        : likes, reactions, like_count
 *   comments     : comments, comment_count
 *   shares       : shares, share_count
 *   saves        : saves, saved, bookmarks
 *   format       : format, type, media_type, post_type
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import Papa from "papaparse"
import { classifyContent, extractHashtags } from "../../lib/classify"
import { buildInsert, categoryRef, channelRef, chunk, lit, postRef, quote } from "../../lib/sql"
import { PLATFORM_MAP } from "../../lib/constants"
import type { Platform, PostFormat } from "../../lib/types"

const args = process.argv.slice(2)
function arg(name: string) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const platform = arg("platform") as Platform | undefined
const file = arg("file")
const VALID: Platform[] = ["tiktok", "instagram", "facebook", "youtube"]

const FIELDS = {
  externalId: ["id", "video_id", "post_id", "permalink", "url", "link"],
  url: ["url", "link", "permalink", "post_url", "video_link"],
  title: ["title", "caption", "description", "name", "video_title", "message"],
  published: ["published", "date", "publish_time", "post_time", "created_time", "time"],
  views: ["views", "video_views", "plays", "impressions", "reach", "play_count"],
  likes: ["likes", "reactions", "like_count", "total_reactions"],
  comments: ["comments", "comment_count"],
  shares: ["shares", "share_count"],
  saves: ["saves", "saved", "bookmarks", "collect_count"],
  format: ["format", "type", "media_type", "post_type"],
} as const

const FORMAT_ALIAS: Record<string, PostFormat> = {
  video: "long",
  reel: "reel",
  reels: "reel",
  short: "short",
  shorts: "short",
  image: "image",
  photo: "image",
  carousel: "carousel",
  album: "carousel",
  live: "live",
  text: "text",
  status: "text",
}

const normalizeKey = (key: string) =>
  key.toLowerCase().trim().replace(/[\s\-.]+/g, "_")

function pick(row: Record<string, string>, candidates: readonly string[]) {
  for (const c of candidates) {
    const v = row[c]
    if (v !== undefined && v !== "") return v
  }
  return undefined
}

function toNumber(value: string | undefined) {
  if (value === undefined) return null
  const n = Number(value.replace(/[,\s"%]/g, ""))
  return Number.isFinite(n) ? n : null
}

function toIso(value: string | undefined) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function main() {
  if (!platform || !VALID.includes(platform)) {
    throw new Error(`--platform must be one of ${VALID.join(", ")}`)
  }
  if (!file) throw new Error("--file <path to csv> is required")
  const meta = PLATFORM_MAP[platform]

  const parsed = Papa.parse<Record<string, string>>(readFileSync(file, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeKey,
  })
  const rows = parsed.data.filter((r) => Object.keys(r).length > 1)
  if (rows.length === 0) throw new Error("No data rows found in the CSV")
  console.log(`Parsed ${rows.length} rows from ${file}`)
  console.log(`Columns: ${Object.keys(rows[0]).join(", ")}`)

  const capturedAt = new Date().toISOString()
  const prepared = rows.flatMap((row) => {
    const externalId = pick(row, FIELDS.externalId)
    if (!externalId) return []
    const title = pick(row, FIELDS.title) ?? null
    const rawFormat = (pick(row, FIELDS.format) ?? "").toLowerCase().trim()
    const views = toNumber(pick(row, FIELDS.views))
    const likes = toNumber(pick(row, FIELDS.likes))
    const comments = toNumber(pick(row, FIELDS.comments))
    const shares = toNumber(pick(row, FIELDS.shares))
    const saves = toNumber(pick(row, FIELDS.saves))
    const engagement =
      views && views > 0
        ? (((likes ?? 0) + (comments ?? 0) + (shares ?? 0) + (saves ?? 0)) / views) * 100
        : null

    return [
      {
        externalId: String(externalId).slice(0, 300),
        url: pick(row, FIELDS.url) ?? String(externalId),
        title,
        publishedAt: toIso(pick(row, FIELDS.published)),
        format: FORMAT_ALIAS[rawFormat] ?? null,
        categorySlug: classifyContent(title),
        hashtags: extractHashtags(title),
        views,
        likes,
        comments,
        shares,
        saves,
        engagement: engagement === null ? null : Number(engagement.toFixed(4)),
      },
    ]
  })

  // Top decile by views becomes the comment-analysis candidate set.
  const sortedViews = prepared
    .map((p) => p.views ?? 0)
    .sort((a, b) => a - b)
  const threshold = sortedViews[Math.floor(sortedViews.length * 0.9)] ?? 0

  const postRows = prepared.map((p) => [
    channelRef(platform, meta.handle.replace(/^@/, "")),
    `${quote(platform)}::platform`,
    lit(p.externalId),
    lit(p.url),
    lit(p.title),
    lit(p.publishedAt),
    p.format ? `${quote(p.format)}::post_format` : "null",
    categoryRef(p.categorySlug),
    lit(p.hashtags),
    lit((p.views ?? 0) >= threshold),
  ])

  const metricRows = prepared.map((p) => [
    postRef(platform, p.externalId),
    lit(capturedAt),
    lit(p.views),
    lit(p.likes),
    lit(p.comments),
    lit(p.shares),
    lit(p.saves),
    lit(p.engagement),
  ])

  const dir = join("data", "raw", `${platform}-${capturedAt.slice(0, 10)}`)
  mkdirSync(dir, { recursive: true })

  chunk(postRows, 200).forEach((group, i) => {
    writeFileSync(
      join(dir, `01-posts-${String(i + 1).padStart(2, "0")}.sql`),
      buildInsert({
        table: "posts",
        columns: [
          "channel_id",
          "platform",
          "external_id",
          "url",
          "title",
          "published_at",
          "format",
          "category_id",
          "hashtags",
          "is_viral",
        ],
        rows: group,
        conflict: "platform, external_id",
        update: ["url", "title", "published_at", "format", "category_id", "hashtags", "is_viral"],
      }),
      "utf8",
    )
  })

  chunk(metricRows, 200).forEach((group, i) => {
    writeFileSync(
      join(dir, `02-metrics-${String(i + 1).padStart(2, "0")}.sql`),
      buildInsert({
        table: "post_metrics",
        columns: [
          "post_id",
          "captured_at",
          "views",
          "likes",
          "comments",
          "shares",
          "saves",
          "engagement_rate",
        ],
        rows: group,
        conflict: "post_id, captured_at",
        update: ["views", "likes", "comments", "shares", "saves", "engagement_rate"],
      }),
      "utf8",
    )
  })

  console.log(
    `Wrote ${prepared.length} posts and metrics to ${dir}. Viral threshold: ${threshold.toLocaleString()} views.`,
  )
}

try {
  main()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

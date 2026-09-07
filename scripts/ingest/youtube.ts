/**
 * YouTube ingestion — one-time historical snapshot.
 *
 * Pulls every public video on the channel from today back to the first upload,
 * plus the comments on mass-reach videos, and writes .sql files to data/raw/.
 * The only credential needed is YOUTUBE_API_KEY; nothing is written to Supabase
 * directly, so no service-role key is involved.
 *
 *   npm run ingest:youtube
 *   npm run ingest:youtube -- --no-comments
 *   npm run ingest:youtube -- --max 200 --comments-per-video 100
 *
 * Then apply data/raw/youtube-<date>/*.sql in order.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadEnv, requireEnv } from "../../lib/env"

loadEnv()

import { createClient } from "@supabase/supabase-js"
import { classifyContent, extractHashtags } from "../../lib/classify"
import {
  classifyFormat,
  getChannelStats,
  getComments,
  getUploadsPlaylistId,
  getVideos,
  listVideoIds,
  type YouTubeVideo,
} from "../../lib/youtube"
import {
  buildInsert,
  categoryRef,
  channelRef,
  chunk,
  lit,
  postRef,
  quote,
} from "../../lib/sql"
import {
  MIN_COMMENTS_FOR_SUMMARY,
  VIRAL_VIEW_PERCENTILE,
  YOUTUBE_CHANNEL_ID,
} from "../../lib/constants"

const args = process.argv.slice(2)
function flagValue(name: string, fallback: number) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : fallback
}

const withComments = !args.includes("--no-comments")
/** Write straight to Supabase instead of only emitting .sql files. */
const apply = args.includes("--apply")
// Default is the full public history, however far back it goes.
const maxVideos = flagValue("max", Number.MAX_SAFE_INTEGER)
const commentsPerVideo = flagValue("comments-per-video", 200)
/** How many of the highest-reach posts to pull comments from. */
const commentVideos = flagValue("comment-videos", 40)

const PLATFORM = "youtube"
const HANDLE = "GoyNattyDream"

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

function postsSql(videos: YouTubeVideo[], viralThreshold: number) {
  const rows = videos.map((v) => {
    const slug = classifyContent(v.title, v.description, v.tags)
    const viral =
      v.views >= viralThreshold && v.comments >= MIN_COMMENTS_FOR_SUMMARY
    return [
      channelRef(PLATFORM, HANDLE),
      `${quote(PLATFORM)}::platform`,
      lit(v.id),
      lit(`https://www.youtube.com/watch?v=${v.id}`),
      lit(v.title),
      lit(v.thumbnail),
      lit(v.publishedAt),
      lit(v.durationSeconds),
      `${quote(classifyFormat(v.durationSeconds))}::post_format`,
      categoryRef(slug),
      lit(extractHashtags(`${v.title} ${v.description}`)),
      lit(viral),
    ]
  })

  return buildInsert({
    table: "posts",
    columns: [
      "channel_id",
      "platform",
      "external_id",
      "url",
      "title",
      "thumbnail_url",
      "published_at",
      "duration_seconds",
      "format",
      "category_id",
      "hashtags",
      "is_viral",
    ],
    rows,
    conflict: "platform, external_id",
    update: [
      "title",
      "thumbnail_url",
      "published_at",
      "duration_seconds",
      "format",
      "category_id",
      "hashtags",
      "is_viral",
    ],
  })
}

function metricsSql(videos: YouTubeVideo[], capturedAt: string) {
  const rows = videos.map((v) => {
    const er = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0
    return [
      postRef(PLATFORM, v.id),
      lit(capturedAt),
      lit(v.views),
      lit(v.likes),
      lit(v.comments),
      lit(Number(er.toFixed(4))),
    ]
  })

  return buildInsert({
    table: "post_metrics",
    columns: [
      "post_id",
      "captured_at",
      "views",
      "likes",
      "comments",
      "engagement_rate",
    ],
    rows,
    conflict: "post_id, captured_at",
    update: ["views", "likes", "comments", "engagement_rate"],
  })
}

/**
 * Direct writer. Uses the service-role key when present; otherwise the anon key,
 * which needs a temporary insert policy on the analytics tables.
 */
function db() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error("No Supabase key available")
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  })
}

async function upsertAll(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  const client = db()
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200)
    const { error } = await client.from(table).upsert(slice, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
    process.stdout.write(`\r  ${table}: ${Math.min(i + 200, rows.length)}/${rows.length}`)
  }
  process.stdout.write("\n")
}

async function main() {
  requireEnv("YOUTUBE_API_KEY")

  const stats = await getChannelStats(YOUTUBE_CHANNEL_ID)
  console.log(
    `Channel: ${stats.title} — ${stats.subscribers.toLocaleString()} subscribers, ${stats.videoCount} public videos`,
  )

  const playlistId = await getUploadsPlaylistId(YOUTUBE_CHANNEL_ID)
  const ids = await listVideoIds(playlistId, maxVideos)
  console.log(`Fetching metadata for ${ids.length} videos...`)

  const videos = await getVideos(ids)
  videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  const viralThreshold = percentile(
    videos.map((v) => v.views),
    VIRAL_VIEW_PERCENTILE,
  )
  const viral = videos.filter(
    (v) => v.views >= viralThreshold && v.comments >= MIN_COMMENTS_FOR_SUMMARY,
  )
  console.log(
    `Range: ${videos.at(-1)?.publishedAt.slice(0, 10)} → ${videos[0]?.publishedAt.slice(0, 10)}`,
  )
  console.log(
    `Viral threshold (p${VIRAL_VIEW_PERCENTILE * 100}): ${viralThreshold.toLocaleString()} views — ${viral.length} videos qualify`,
  )

  const capturedAt = new Date().toISOString()
  const dir = join("data", "raw", `youtube-${capturedAt.slice(0, 10)}`)
  mkdirSync(dir, { recursive: true })

  const files: [string, string][] = [
    [
      "00-channel.sql",
      `update channels set followers = ${lit(stats.subscribers)}\nwhere platform = ${quote(PLATFORM)}::platform and handle = ${quote(HANDLE)};\n\n` +
        buildInsert({
          table: "channel_metrics_daily",
          columns: ["channel_id", "date", "followers", "views"],
          rows: [
            [
              channelRef(PLATFORM, HANDLE),
              lit(capturedAt.slice(0, 10)),
              lit(stats.subscribers),
              lit(stats.views),
            ],
          ],
          conflict: "channel_id, date",
          update: ["followers", "views"],
        }),
    ],
  ]

  chunk(videos, 300).forEach((group, i) => {
    files.push([`01-posts-${String(i + 1).padStart(2, "0")}.sql`, postsSql(group, viralThreshold)])
  })
  chunk(videos, 1200).forEach((group, i) => {
    files.push([
      `02-metrics-${String(i + 1).padStart(2, "0")}.sql`,
      metricsSql(group, capturedAt),
    ])
  })

  const collectedComments: {
    videoId: string
    id: string
    author: string
    text: string
    likeCount: number
    publishedAt: string
  }[] = []

  const commentTargets = [...viral]
    .sort((a, b) => b.views - a.views)
    .slice(0, commentVideos)

  if (withComments && commentTargets.length > 0) {
    console.log(
      `Fetching comments for the top ${commentTargets.length} of ${viral.length} mass-reach videos...`,
    )
    const allRows: string[][] = []

    for (const v of commentTargets) {
      const comments = await getComments(v.id, commentsPerVideo)
      if (comments.length === 0) continue
      for (const c of comments) {
        collectedComments.push({ videoId: v.id, ...c })
        allRows.push([
          postRef(PLATFORM, v.id),
          lit(c.id),
          lit(c.author),
          lit(c.text.slice(0, 4000)),
          lit(c.likeCount),
          lit(c.publishedAt),
        ])
      }
      console.log(
        `  ${comments.length.toString().padStart(4)} comments  ${v.title.slice(0, 56)}`,
      )
    }

    chunk(allRows, 1200).forEach((group, i) => {
      files.push([
        `03-comments-${String(i + 1).padStart(3, "0")}.sql`,
        buildInsert({
          table: "post_comments",
          columns: [
            "post_id",
            "external_id",
            "author",
            "text",
            "like_count",
            "published_at",
          ],
          rows: group,
          conflict: "post_id, external_id",
          update: ["text", "like_count"],
        }),
      ])
    })
    console.log(`Collected ${allRows.length} comments`)
  }

  for (const [name, sql] of files) {
    if (!sql) continue
    writeFileSync(join(dir, name), sql, "utf8")
  }
  console.log(`\nWrote ${files.filter(([, s]) => s).length} files to ${dir}`)

  if (!apply) {
    console.log("Apply them in filename order in the Supabase SQL Editor.")
    return
  }

  console.log("\nWriting to Supabase...")
  const client = db()

  const { data: channel, error: channelError } = await client
    .from("channels")
    .select("id")
    .eq("platform", PLATFORM)
    .eq("handle", HANDLE)
    .single()
  if (channelError || !channel) {
    throw new Error("YouTube channel row not found. Run the seed migration.")
  }

  const { data: categories } = await client
    .from("content_categories")
    .select("id, slug")
  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]))

  await client
    .from("channels")
    .update({ followers: stats.subscribers })
    .eq("id", channel.id)
  await client.from("channel_metrics_daily").upsert(
    {
      channel_id: channel.id,
      date: capturedAt.slice(0, 10),
      followers: stats.subscribers,
      views: stats.views,
    },
    { onConflict: "channel_id,date" },
  )

  await upsertAll(
    "posts",
    videos.map((v) => ({
      channel_id: channel.id,
      platform: PLATFORM,
      external_id: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      title: v.title,
      thumbnail_url: v.thumbnail,
      published_at: v.publishedAt,
      duration_seconds: v.durationSeconds,
      format: classifyFormat(v.durationSeconds),
      category_id:
        categoryId.get(classifyContent(v.title, v.description, v.tags)) ??
        categoryId.get("other") ??
        null,
      hashtags: extractHashtags(`${v.title} ${v.description}`),
      is_viral:
        v.views >= viralThreshold && v.comments >= MIN_COMMENTS_FOR_SUMMARY,
      updated_at: capturedAt,
    })),
    "platform,external_id",
  )

  // PostgREST caps a single response at 1000 rows, so page through the ids.
  const postId = new Map<string, string>()
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await client
      .from("posts")
      .select("id, external_id")
      .eq("platform", PLATFORM)
      .order("external_id")
      .range(from, from + 999)
    if (error) throw error
    for (const row of page ?? []) postId.set(row.external_id, row.id)
    if (!page || page.length < 1000) break
  }
  console.log(`  resolved ${postId.size} post ids`)

  await upsertAll(
    "post_metrics",
    videos.flatMap((v) => {
      const id = postId.get(v.id)
      if (!id) return []
      const er = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0
      return [
        {
          post_id: id,
          captured_at: capturedAt,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          engagement_rate: Number(er.toFixed(4)),
        },
      ]
    }),
    "post_id,captured_at",
  )

  if (collectedComments.length > 0) {
    await upsertAll(
      "post_comments",
      collectedComments.flatMap((c) => {
        const id = postId.get(c.videoId)
        if (!id) return []
        return [
          {
            post_id: id,
            external_id: c.id,
            author: c.author,
            text: c.text.slice(0, 4000),
            like_count: c.likeCount,
            published_at: c.publishedAt,
          },
        ]
      }),
      "post_id,external_id",
    )
  }

  console.log("Done.")
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

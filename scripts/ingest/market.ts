/**
 * Builds the Thai audience-market corpus.
 *
 *   npm run ingest:market                          # trending census + searches + comments
 *   npm run ingest:market -- --skip-search         # trending only, ~50 quota units
 *   npm run ingest:market -- --queries 12 --comments-per-video 200
 *   npm run ingest:market -- --comments-only       # top up comments on stored videos
 *   npm run ingest:market -- --dry
 *
 * Needs YOUTUBE_API_KEY and SUPABASE_SERVICE_ROLE_KEY.
 *
 * WHERE THE CORPUS COMES FROM, AND WHY BOTH SOURCES ARE NEEDED
 *   1. Trending census — YouTube's own mostPopular chart for regionCode=TH,
 *      walked category by category. This is a ranking YouTube produced, not a
 *      query we wrote, so it carries none of our keyword bias. Walking it per
 *      category is what stops Music (which owns the overall chart) from
 *      swallowing the sample.
 *   2. Interest-balanced search — trending is a snapshot of one week and skews
 *      hard to entertainment, so it under-samples the subjects an audience
 *      seeks out deliberately: money, health, study, family. A fixed Thai query
 *      per theme tops those up to a usable size.
 *
 * Each video's discovered_via records which source it came from, because the
 * two cannot be read the same way: trending rows support "what Thailand
 * watched", search rows support "within this subject, who is watching".
 *
 * QUOTA, which dictates the shape of this script: videos.list is 1 unit per
 * call of up to 50 ids, commentThreads is 1 unit per 100 comments, and
 * search.list is 100 units per call. The default run spends roughly
 * 40 (trending) + 100·queries (search) + 2·videos (comments) units against a
 * 10,000/day ceiling, so --queries is the knob that matters.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { loadEnv, requireEnv } from "../../lib/env"

loadEnv()

import { createAdminClient } from "../../lib/supabase/server"
import {
  classifyFormat,
  getChannels,
  getComments,
  getMarketVideos,
  getTrending,
  searchVideoIds,
  type MarketVideo,
} from "../../lib/youtube"
import { classifyCohort } from "../../lib/cohort"
import { CATEGORIES, classifyTheme } from "../../lib/thai-market"

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const num = (name: string, fallback: number) => {
  const v = flag(name)
  return v === undefined ? fallback : Number(v)
}
const has = (name: string) => args.includes(`--${name}`)

const REGION = flag("region") ?? "TH"
const perVideoComments = num("comments-per-video", 200)
const queryLimit = num("queries", 24)
const trendingPerCategory = num("trending-per-category", 100)
const dry = has("dry")
const skipSearch = has("skip-search")
const skipComments = has("skip-comments")
const commentsOnly = has("comments-only")
const refetch = has("refetch")
const fromCache = has("from-cache")

/**
 * Discovery is the expensive half (100 quota units per search call), so every
 * run writes what it found to disk before touching the database. A failed
 * upsert then costs nothing: fix the code and re-run with --from-cache.
 */
const CACHE_DIR = join("data", "raw", "market")
const CACHE_FILE = join(CACHE_DIR, "videos.json")

/**
 * Discovery queries, ordered by how much usable age evidence they return.
 *
 * MEASURED, NOT GUESSED — and the finding was a surprise worth writing down.
 * Topic queries against top-viewed video ("เพลง เพราะ", "ซีรีส์ ละคร") produce
 * almost no age evidence: the first 71,000 comments collected this way yielded
 * 57 usable cohort signals, 0.08%. Comments on a hit music video are praise,
 * and praise says nothing about the commenter.
 *
 * Self-reported age concentrates in ADVICE-SEEKING content. A viewer states
 * their age when the age is load-bearing for the answer they want — "ผมอายุ 27
 * เริ่มลงทุนยังไงดี", "ตอนนี้อายุ 50 จะเริ่มยังไง". A calibration corpus of
 * finance-coaching and life-advice videos returned 0.43%, five times the rate,
 * from the same classifier.
 *
 * So advice-shaped queries lead this list. --queries truncates from the end,
 * which means a quota-constrained run keeps the queries that actually feed the
 * cohort matrix and drops the ones that only measure market scale — the
 * trending census already covers scale for free.
 */
const QUERIES = [
  // Advice-seeking: the age-evidence tier.
  "ปรึกษาปัญหาชีวิต",
  "เริ่มลงทุน อายุเท่าไหร่",
  "วางแผนเกษียณ",
  "ปลดหนี้ เริ่มต้นใหม่",
  "ปรึกษาปัญหาสุขภาพ",
  "ปรึกษาปัญหาความรัก",
  "ปรึกษาปัญหาครอบครัว",
  "เล่าประสบการณ์ชีวิต",
  "สัมภาษณ์ชีวิต",
  "พอดแคสต์ คุยเรื่องชีวิต",
  "โค้ชการเงิน สอนเก็บเงิน",
  "เปลี่ยนสายงาน วัยทำงาน",
  "เรียนต่อ ควรเลือกอะไร",
  "ดูแลพ่อแม่สูงอายุ",
  "เลี้ยงลูก ปรึกษา",
  // Subject scale: kept for topic balance.
  "ลงทุน เก็บเงิน",
  "สุขภาพ ดูแลตัวเอง",
  "เรียน สอบ ติว",
  "เลี้ยงลูก คุณแม่",
  "หางาน อาชีพ เงินเดือน",
  "ความรัก แฟน อกหัก",
  "ธรรมะ ทำบุญ",
  "ทำอาหาร เมนู",
  "เที่ยว ทริป",
  "แต่งหน้า สกินแคร์",
  "รีวิวมือถือ",
  "หมา แมว สัตว์เลี้ยง",
  "ออกกำลังกาย ลดน้ำหนัก",
  "เกม เล่นเกม",
  "ตลก ขำ",
  "ซีรีส์ ละคร",
  "เพลง เพราะ",
  "ข่าว สังคม",
  "พัฒนาตัวเอง แรงบันดาลใจ",
  "รีวิวรถ",
  "หนี้ ปลดหนี้",
  "วัยเกษียณ ผู้สูงอายุ",
  "มนุษย์เงินเดือน ออฟฟิศ",
  "นักศึกษา มหาลัย",
  "คาเฟ่ ร้านอาหาร",
  "ดูดวง หมอดู",
  "ประกันสุขภาพ",
  "ธุรกิจ ขายของออนไลน์",
]

const supabase = dry ? null : createAdminClient()
if (!dry) requireEnv("SUPABASE_SERVICE_ROLE_KEY")
requireEnv("YOUTUBE_API_KEY")

/**
 * Retries a Supabase write through a transient network failure. A single
 * "fetch failed" three minutes into a 2,000-video run would otherwise throw
 * away the rest of the run's quota.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const wait = 500 * 2 ** (attempt - 1)
      console.log(`  ${label} attempt ${attempt} failed, retrying in ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error(`${label} failed after 4 attempts: ${String(lastErr)}`)
}

const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) =>
    xs.slice(i * n, i * n + n),
  )

/**
 * Strips what Postgres will not accept in a text column: control codes, and
 * unpaired surrogates left behind by slicing a string to a fixed length. Both
 * surface as the same opaque PostgREST error, "invalid input syntax for type
 * json", and one bad row fails the whole 200-row batch.
 */
const clean = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    // Unpaired surrogates. Slicing a description to a fixed length cuts emoji
    // in half, and half an emoji is not valid JSON — PostgREST rejects the
    // whole batch with "invalid input syntax for type json".
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g, "$1")

function videoRow(v: MarketVideo, via: string, query: string | null) {
  return {
    video_id: v.id,
    channel_id: v.channelId,
    channel_title: clean(v.channelTitle),
    title: clean(v.title),
    description: clean(v.description.slice(0, 2000)),
    category_id: v.categoryId,
    theme: classifyTheme(v.title, v.description, v.tags),
    published_at: v.publishedAt,
    duration_seconds: v.durationSeconds,
    format: classifyFormat(v.durationSeconds),
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    tags: v.tags.slice(0, 40).map(clean),
    discovered_via: via,
    discovery_query: query,
    fetched_at: new Date().toISOString(),
  }
}

async function upsertVideos(rows: ReturnType<typeof videoRow>[]) {
  if (dry || rows.length === 0) return
  for (const part of chunk(rows, 200)) {
    await withRetry("market_videos upsert", async () => {
      const { error } = await supabase!
        .from("market_videos")
        .upsert(part, { onConflict: "video_id" })
      if (error) throw new Error(error.message)
    })
  }
}

/** Discovery: the trending census, then the interest top-up. */
async function discover() {
  const seen = new Map<string, ReturnType<typeof videoRow>>()

  console.log(`\n== trending census (regionCode=${REGION}) ==`)
  const overall = await getTrending(REGION, undefined, trendingPerCategory)
  for (const v of overall) seen.set(v.id, videoRow(v, "trending", null))
  console.log(`  overall chart: ${overall.length}`)

  for (const cat of CATEGORIES) {
    let vids: MarketVideo[] = []
    try {
      vids = await getTrending(REGION, cat.id, trendingPerCategory)
    } catch (err) {
      console.log(`  ${cat.labelEn}: skipped (${String(err).slice(0, 60)})`)
      continue
    }
    for (const v of vids) {
      if (!seen.has(v.id)) seen.set(v.id, videoRow(v, "trending", null))
    }
    console.log(`  ${cat.labelEn}: ${vids.length}`)
  }
  console.log(`  unique so far: ${seen.size}`)

  if (!skipSearch) {
    console.log(`\n== interest-balanced search (${queryLimit} queries) ==`)
    // Two years back: long enough that a subject with a slow publishing cycle
    // still has entries, recent enough that the comments are current audience.
    const publishedAfter = new Date(
      Date.now() - 730 * 24 * 3600 * 1000,
    ).toISOString()

    for (const q of QUERIES.slice(0, queryLimit)) {
      try {
        const ids = await searchVideoIds({
          query: q,
          regionCode: REGION,
          publishedAfter,
          max: 50,
        })
        const fresh = ids.filter((id) => !seen.has(id))
        const vids = fresh.length > 0 ? await getMarketVideos(fresh) : []
        for (const v of vids) seen.set(v.id, videoRow(v, "search", q))
        console.log(`  "${q}": +${vids.length} (${ids.length} hits)`)
      } catch (err) {
        console.log(`  "${q}": failed — ${String(err).slice(0, 80)}`)
        // A quota exhaustion mid-run should keep what was already discovered.
        if (String(err).includes("quotaExceeded")) break
      }
    }
  }

  const rows = [...seen.values()]
  console.log(`\ndiscovered ${rows.length} videos`)
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(CACHE_FILE, JSON.stringify(rows, null, 1))
  console.log(`cached to ${CACHE_FILE}`)
  await upsertVideos(rows)
  return rows
}

async function upsertChannels(channelIds: string[]) {
  console.log(`\n== channels (${channelIds.length}) ==`)
  const rows: Record<string, unknown>[] = []
  for (const part of chunk(channelIds, 50)) {
    try {
      const chans = await getChannels(part)
      for (const c of chans) {
        rows.push({
          channel_id: c.channelId,
          title: clean(c.title),
          description: clean(c.description.slice(0, 1000)),
          country: c.country,
          subscribers: c.subscribers,
          total_views: c.totalViews,
          video_count: c.videoCount,
          fetched_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.log(`  batch failed — ${String(err).slice(0, 80)}`)
    }
  }
  console.log(`  fetched ${rows.length}`)
  if (dry || rows.length === 0) return
  for (const part of chunk(rows, 200)) {
    await withRetry("market_channels upsert", async () => {
      const { error } = await supabase!
        .from("market_channels")
        .upsert(part, { onConflict: "channel_id" })
      if (error) throw new Error(error.message)
    })
  }
}

/** Which stored videos still need comments. */
async function videosNeedingComments(): Promise<
  {
    video_id: string
    comments: number | null
    title: string
    discovered_via: string
  }[]
> {
  if (dry) return []
  // PostgREST caps an unranged select at 1000 rows, which silently truncated
  // this list to well under half the corpus, so it is paged explicitly.
  const PAGE = 1000
  const vids: { video_id: string; comments: number | null; title: string; discovered_via: string }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase!
      .from("market_videos")
      .select("video_id, comments, title, discovered_via")
      .order("views", { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`market_videos read: ${error.message}`)
    vids.push(...((data ?? []) as typeof vids))
    if (!data || data.length < PAGE) break
  }

  if (refetch) return vids

  // Videos already represented in market_comments are skipped, so a run can be
  // resumed after a quota stop without re-spending units on the same videos.
  const done = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error: e } = await supabase!
      .from("market_comments")
      .select("video_id")
      .range(from, from + PAGE - 1)
    if (e) throw new Error(`market_comments read: ${e.message}`)
    for (const r of data ?? []) done.add(r.video_id as string)
    if (!data || data.length < PAGE) break
  }
  return vids.filter((v) => !done.has(v.video_id))
}

async function ingestComments() {
  /**
   * Search-discovered videos first. Trending is dominated by music and clips,
   * where comments are short reactions — the first 2,482 comments off the
   * trending chart produced 3 usable age signals. Videos found by subject
   * search (money, health, retirement) are where viewers explain their own
   * situation, and with it their age, so they are worth the quota first.
   */
  const targets = (await videosNeedingComments())
    .filter((v) => (v.comments ?? 0) > 0)
    .sort((a, b) =>
      a.discovered_via === b.discovered_via
        ? 0
        : a.discovered_via === "search"
          ? -1
          : 1,
    )
  console.log(`\n== comments (${targets.length} videos need them) ==`)

  let stored = 0
  let cohortSignals = 0
  let done = 0

  for (const v of targets) {
    let cs
    try {
      cs = await getComments(v.video_id, perVideoComments)
    } catch (err) {
      if (String(err).includes("quotaExceeded")) {
        console.log("  quota exhausted — stopping, run again tomorrow")
        break
      }
      continue
    }
    if (cs.length === 0) continue

    const rows = cs.map((c) => {
      const read = classifyCohort(c.text)
      if (read) cohortSignals++
      return {
        comment_id: c.id,
        video_id: v.video_id,
        text: clean(c.text.slice(0, 4000)),
        like_count: c.likeCount,
        published_at: c.publishedAt,
        cohort: read?.band ?? null,
        evidence: read?.evidence ?? null,
        stated_age: read?.age ?? null,
        claims_parent: read?.isParent ?? false,
        fetched_at: new Date().toISOString(),
      }
    })

    if (!dry) {
      for (const part of chunk(rows, 500)) {
        await withRetry("market_comments upsert", async () => {
          const { error } = await supabase!
            .from("market_comments")
            .upsert(part, { onConflict: "comment_id" })
          if (error) throw new Error(error.message)
        })
      }
    }
    stored += rows.length
    done++
    if (done % 25 === 0) {
      console.log(
        `  ${done}/${targets.length} videos · ${stored} comments · ${cohortSignals} cohort signals`,
      )
    }
  }

  console.log(
    `\ncomments stored ${stored} · cohort signals ${cohortSignals} (${
      stored > 0 ? ((cohortSignals / stored) * 100).toFixed(2) : "0"
    }%)`,
  )
}

function readCache(): ReturnType<typeof videoRow>[] {
  if (!existsSync(CACHE_FILE)) {
    throw new Error(`No ${CACHE_FILE}. Run once without --from-cache first.`)
  }
  return JSON.parse(readFileSync(CACHE_FILE, "utf8"))
}

async function main() {
  if (!commentsOnly) {
    const rows = fromCache ? readCache() : await discover()
    if (fromCache) {
      console.log(`replaying ${rows.length} cached videos`)
      await upsertVideos(rows)
    }
    const channelIds = [...new Set(rows.map((r) => r.channel_id))]
    await upsertChannels(channelIds)
  }
  if (!skipComments) await ingestComments()
  console.log(dry ? "\ndry run — nothing written" : "\ndone")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

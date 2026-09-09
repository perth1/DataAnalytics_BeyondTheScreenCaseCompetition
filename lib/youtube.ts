import type { PostFormat } from "@/lib/types"

const API = "https://www.googleapis.com/youtube/v3"

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string | null
  publishedAt: string
  durationSeconds: number
  views: number
  likes: number
  comments: number
  tags: string[]
}

export interface YouTubeComment {
  id: string
  author: string
  text: string
  likeCount: number
  publishedAt: string
}

function key() {
  const k = process.env.YOUTUBE_API_KEY
  if (!k) throw new Error("YOUTUBE_API_KEY is not set")
  return k
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`)
  for (const [k, v] of Object.entries({ ...params, key: key() })) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`YouTube ${path} ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

/** ISO-8601 duration (PT1H2M3S) to seconds. */
export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!m) return 0
  const [, d, h, min, s] = m
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Number(s ?? 0)
  )
}

/** YouTube treats vertical video under 3 minutes as a Short. */
export function classifyFormat(durationSeconds: number): PostFormat {
  return durationSeconds > 0 && durationSeconds <= 180 ? "short" : "long"
}

export async function getUploadsPlaylistId(channelId: string) {
  const data = await get<{
    items: { contentDetails: { relatedPlaylists: { uploads: string } } }[]
  }>("channels", { part: "contentDetails", id: channelId })
  const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!id) throw new Error(`No uploads playlist for channel ${channelId}`)
  return id
}

export async function getChannelStats(channelId: string) {
  const data = await get<{
    items: {
      snippet: { title: string; description: string }
      statistics: {
        subscriberCount?: string
        viewCount?: string
        videoCount?: string
      }
    }[]
  }>("channels", { part: "snippet,statistics", id: channelId })
  const item = data.items?.[0]
  if (!item) throw new Error(`Channel ${channelId} not found`)
  return {
    title: item.snippet.title,
    subscribers: Number(item.statistics.subscriberCount ?? 0),
    views: Number(item.statistics.viewCount ?? 0),
    videoCount: Number(item.statistics.videoCount ?? 0),
  }
}

/** All video ids in the uploads playlist, newest first. */
export async function listVideoIds(
  playlistId: string,
  max = Number.MAX_SAFE_INTEGER,
) {
  const ids: string[] = []
  let pageToken: string | undefined

  do {
    const data = await get<{
      items: { contentDetails: { videoId: string } }[]
      nextPageToken?: string
    }>("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    })
    ids.push(...data.items.map((i) => i.contentDetails.videoId))
    pageToken = data.nextPageToken
  } while (pageToken && ids.length < max)

  return ids.slice(0, max)
}

export async function getVideos(ids: string[]): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = []

  for (let i = 0; i < ids.length; i += 50) {
    const data = await get<{
      items: {
        id: string
        snippet: {
          title: string
          description: string
          publishedAt: string
          tags?: string[]
          thumbnails: Record<string, { url: string }>
        }
        contentDetails: { duration: string }
        statistics: {
          viewCount?: string
          likeCount?: string
          commentCount?: string
        }
      }[]
    }>("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.slice(i, i + 50).join(","),
    })

    for (const v of data.items) {
      const thumbs = v.snippet.thumbnails
      out.push({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail:
          thumbs.maxres?.url ??
          thumbs.standard?.url ??
          thumbs.high?.url ??
          thumbs.medium?.url ??
          null,
        publishedAt: v.snippet.publishedAt,
        durationSeconds: parseDuration(v.contentDetails.duration),
        views: Number(v.statistics.viewCount ?? 0),
        likes: Number(v.statistics.likeCount ?? 0),
        comments: Number(v.statistics.commentCount ?? 0),
        tags: v.snippet.tags ?? [],
      })
    }
  }

  return out
}

export async function getComments(
  videoId: string,
  max = 200,
): Promise<YouTubeComment[]> {
  const out: YouTubeComment[] = []
  let pageToken: string | undefined

  do {
    let data
    try {
      data = await get<{
        items: {
          snippet: {
            topLevelComment: {
              id: string
              snippet: {
                authorDisplayName: string
                textOriginal: string
                likeCount: number
                publishedAt: string
              }
            }
          }
        }[]
        nextPageToken?: string
      }>("commentThreads", {
        part: "snippet",
        videoId,
        maxResults: "100",
        order: "relevance",
        textFormat: "plainText",
        ...(pageToken ? { pageToken } : {}),
      })
    } catch (err) {
      // Comments disabled on the video - not a fatal ingestion error.
      if (String(err).includes("403")) return out
      throw err
    }

    for (const item of data.items) {
      const c = item.snippet.topLevelComment
      out.push({
        id: c.id,
        author: c.snippet.authorDisplayName,
        text: c.snippet.textOriginal,
        likeCount: c.snippet.likeCount,
        publishedAt: c.snippet.publishedAt,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken && out.length < max)

  return out.slice(0, max)
}

/* ------------------------------------------------------------------ market
 * Discovery calls for the Thai audience-market corpus. These read OTHER
 * people's channels, so they carry channelId and categoryId — the two fields
 * the market views join on and which getVideos() above does not need.
 *
 * Quota note, because it shapes how the ingest is written: videos.list costs
 * 1 unit per call (up to 50 ids), commentThreads 1 unit per 100 comments, but
 * search.list costs 100 units per call. Trending is therefore the cheap way to
 * get breadth and search is spent only where the corpus needs balancing.
 */

export interface MarketVideo extends YouTubeVideo {
  channelId: string
  channelTitle: string
  categoryId: number | null
}

interface RawVideoItem {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    channelId: string
    channelTitle: string
    categoryId?: string
    tags?: string[]
    thumbnails: Record<string, { url: string }>
    defaultAudioLanguage?: string
    defaultLanguage?: string
  }
  contentDetails: { duration: string }
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
}

function toMarketVideo(v: RawVideoItem): MarketVideo {
  const thumbs = v.snippet.thumbnails
  return {
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: thumbs.high?.url ?? thumbs.medium?.url ?? null,
    publishedAt: v.snippet.publishedAt,
    durationSeconds: parseDuration(v.contentDetails.duration),
    views: Number(v.statistics.viewCount ?? 0),
    likes: Number(v.statistics.likeCount ?? 0),
    comments: Number(v.statistics.commentCount ?? 0),
    tags: v.snippet.tags ?? [],
    channelId: v.snippet.channelId,
    channelTitle: v.snippet.channelTitle,
    categoryId: v.snippet.categoryId ? Number(v.snippet.categoryId) : null,
  }
}

/**
 * YouTube's own most-popular chart for a region. This is the closest thing to a
 * census of what a country is watching right now: it is YouTube's ranking, not
 * a query result, so it carries no keyword bias of ours.
 *
 * Passing a categoryId walks the chart category by category, which is what
 * keeps Music from swallowing the whole corpus.
 */
export async function getTrending(
  regionCode: string,
  categoryId?: number,
  max = 200,
): Promise<MarketVideo[]> {
  const out: MarketVideo[] = []
  let pageToken: string | undefined

  do {
    let data: { items: RawVideoItem[]; nextPageToken?: string }
    try {
      data = await get<{ items: RawVideoItem[]; nextPageToken?: string }>(
        "videos",
        {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode,
          maxResults: "50",
          ...(categoryId ? { videoCategoryId: String(categoryId) } : {}),
          ...(pageToken ? { pageToken } : {}),
        },
      )
    } catch (err) {
      // Several categories have no chart in a given region. Not fatal.
      if (String(err).includes("404") || String(err).includes("400")) return out
      throw err
    }
    out.push(...data.items.map(toMarketVideo))
    pageToken = data.nextPageToken
  } while (pageToken && out.length < max)

  return out.slice(0, max)
}

/** Video ids for a Thai-language query, most-viewed first. 100 quota units. */
export async function searchVideoIds(opts: {
  query: string
  regionCode?: string
  language?: string
  publishedAfter?: string
  order?: "viewCount" | "relevance" | "date"
  max?: number
}): Promise<string[]> {
  const data = await get<{ items: { id: { videoId: string } }[] }>("search", {
    part: "id",
    q: opts.query,
    type: "video",
    regionCode: opts.regionCode ?? "TH",
    relevanceLanguage: opts.language ?? "th",
    order: opts.order ?? "viewCount",
    maxResults: String(Math.min(opts.max ?? 50, 50)),
    ...(opts.publishedAfter ? { publishedAfter: opts.publishedAfter } : {}),
  })
  return data.items.map((i) => i.id.videoId).filter(Boolean)
}

/** Full records for ids from search, which returns snippets without stats. */
export async function getMarketVideos(ids: string[]): Promise<MarketVideo[]> {
  const out: MarketVideo[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const data = await get<{ items: RawVideoItem[] }>("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.slice(i, i + 50).join(","),
    })
    out.push(...data.items.map(toMarketVideo))
  }
  return out
}

export interface MarketChannel {
  channelId: string
  title: string
  description: string
  country: string | null
  subscribers: number
  totalViews: number
  videoCount: number
}

/** Channel records, 50 at a time. Subscriber counts may be hidden. */
export async function getChannels(ids: string[]): Promise<MarketChannel[]> {
  const out: MarketChannel[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const data = await get<{
      items: {
        id: string
        snippet: { title: string; description: string; country?: string }
        statistics: {
          subscriberCount?: string
          viewCount?: string
          videoCount?: string
          hiddenSubscriberCount?: boolean
        }
      }[]
    }>("channels", {
      part: "snippet,statistics",
      id: ids.slice(i, i + 50).join(","),
    })
    for (const c of data.items) {
      out.push({
        channelId: c.id,
        title: c.snippet.title,
        description: c.snippet.description ?? "",
        country: c.snippet.country ?? null,
        subscribers: c.statistics.hiddenSubscriberCount
          ? 0
          : Number(c.statistics.subscriberCount ?? 0),
        totalViews: Number(c.statistics.viewCount ?? 0),
        videoCount: Number(c.statistics.videoCount ?? 0),
      })
    }
  }
  return out
}

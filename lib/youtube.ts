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

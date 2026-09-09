import type { Platform, PostFormat } from "@/lib/types"

/** Every native format the ingest can stamp on a post; guards `?format=` input. */
export const POST_FORMATS: PostFormat[] = [
  "long",
  "short",
  "reel",
  "image",
  "carousel",
  "live",
  "text",
]

export const BRAND = {
  name: "Beyond The Screen",
  subject: "GoyNattyDream",
  tagline: "Cross-platform content & audience intelligence",
}

export interface PlatformMeta {
  key: Platform
  label: string
  handle: string
  url: string
  primary: boolean
}

export const PLATFORMS: PlatformMeta[] = [
  {
    key: "youtube",
    label: "YouTube",
    handle: "GoyNattyDream",
    url: "https://www.youtube.com/channel/UCT2G8BGZgubYAOYrFO9NSAg",
    primary: true,
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@goynattydreamchannel",
    url: "https://www.tiktok.com/@goynattydreamchannel",
    primary: false,
  },
  {
    key: "instagram",
    label: "Instagram",
    handle: "@goynattydreamofficial",
    url: "https://www.instagram.com/goynattydreamofficial/",
    primary: false,
  },
  {
    key: "facebook",
    label: "Facebook",
    handle: "goynattydream",
    url: "https://www.facebook.com/goynattydream/",
    primary: false,
  },
]

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p]),
) as Record<Platform, PlatformMeta>

export const YOUTUBE_CHANNEL_ID = "UCT2G8BGZgubYAOYrFO9NSAg"

/** Series-first taxonomy — see lib/classify.ts for why. */
export const CONTENT_CATEGORIES = [
  { slug: "tha-nu-rap", name: "ถ้าหนูรับ พี่จะรักป่ะ" },
  { slug: "yangngai-nailao", name: "ยังไงไหนเล่า" },
  { slug: "friendsfly", name: "Friendsfly" },
  { slug: "carra-carsang", name: "CarราCarซัง" },
  { slug: "my-ambulove", name: "My Ambulove" },
  { slug: "last-supper", name: "มื้อสุดท้ายก่อนตาย / Last Supper" },
  { slug: "ploy-ku-pai", name: "ปล่อยกูไป" },
  { slug: "lamdap-watjai", name: "ลำดับวัดใจ" },
  { slug: "dream-mao", name: "ดรีมเมา" },
  { slug: "khuenton-longthai", name: "ขึ้นต้นลงท้าย" },
  { slug: "this-or-that", name: "This or That" },
  { slug: "music", name: "เพลง / MV" },
  { slug: "game", name: "เกม & ชาเลนจ์" },
  { slug: "travel", name: "ท่องเที่ยว" },
  { slug: "food", name: "อาหาร" },
  { slug: "talk", name: "พูดคุย & สัมภาษณ์" },
  { slug: "sponsored", name: "สปอนเซอร์ / ไทอิน" },
  { slug: "other", name: "อื่น ๆ" },
] as const

/** A post enters the Claude comment-summary pipeline above this percentile. */
export const VIRAL_VIEW_PERCENTILE = 0.9
export const MIN_COMMENTS_FOR_SUMMARY = 30

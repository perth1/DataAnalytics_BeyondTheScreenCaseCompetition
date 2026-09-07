import type { Platform } from "@/lib/types"

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
  { slug: "music", name: "Music / MV" },
  { slug: "game", name: "Game & Challenge" },
  { slug: "travel", name: "Travel" },
  { slug: "food", name: "Food" },
  { slug: "talk", name: "Talk & Interview" },
  { slug: "sponsored", name: "Sponsored / Tie-in" },
  { slug: "other", name: "Other" },
] as const

/** A post enters the Claude comment-summary pipeline above this percentile. */
export const VIRAL_VIEW_PERCENTILE = 0.9
export const MIN_COMMENTS_FOR_SUMMARY = 30

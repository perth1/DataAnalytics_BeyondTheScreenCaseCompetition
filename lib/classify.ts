/**
 * Content classification for GoyNattyDream.
 *
 * The channel programs by SERIES (รายการ), not by generic topic — 2,367 titles
 * show recurring formats like "ถ้าหนูรับ พี่จะรักป่ะ" (185), "ยังไงไหนเล่า" (173),
 * and "Friendsfly" (142), while topical buckets like food or beauty barely
 * appear. Series identity is therefore the useful cut: it answers which format
 * earns reach and engagement.
 *
 * Shorts are usually cut-downs of a series episode and carry the series hashtag
 * even when the title does not, so both signals are matched.
 */
interface SeriesRule {
  slug: string
  /** Lowercased substrings matched against title, description, and hashtags. */
  markers: string[]
}

const SERIES: SeriesRule[] = [
  { slug: "tha-nu-rap", markers: ["ถ้าหนูรับ", "#ถ้าหนูรับพี่จะรักป่ะ"] },
  { slug: "yangngai-nailao", markers: ["ยังไงไหนเล่า", "#ยังไงไหนเล่า"] },
  { slug: "friendsfly", markers: ["friendsfly", "#friendsflyth"] },
  { slug: "carra-carsang", markers: ["carรา", "#carราcarซัง"] },
  { slug: "my-ambulove", markers: ["my ambulove", "#myambulove"] },
  {
    slug: "last-supper",
    markers: ["มื้อสุดท้าย", "last supper", "#มื้อสุดท้ายก่อนตาย"],
  },
  { slug: "ploy-ku-pai", markers: ["ปล่อยกูไป", "#ปล่อยกูไป"] },
  { slug: "lamdap-watjai", markers: ["ลำดับวัดใจ", "#ลำดับวัดใจ"] },
  { slug: "dream-mao", markers: ["ดรีมเมา", "#ดรีมเมา"] },
  { slug: "khuenton-longthai", markers: ["ขึ้นต้นลงท้าย", "#ขึ้นต้นลงท้าย"] },
  { slug: "this-or-that", markers: ["this or that", "#thisorthat"] },
  { slug: "music", markers: ["official mv", "[official", "official audio"] },
]

/** Applied only when no series matched, so a sponsored episode keeps its series. */
const FALLBACK: SeriesRule[] = [
  {
    slug: "sponsored",
    markers: [
      "ได้รับการสนับสนุน",
      "presented by",
      "sponsored",
      "#โฆษณา",
      "tie-in",
    ],
  },
  {
    slug: "game",
    markers: ["ชาเลนจ์", "challenge", "ท้า", "เกม", "วัดใจ", "แข่ง", "ภารกิจ"],
  },
  {
    slug: "travel",
    markers: ["เที่ยว", "ทริป", "พาเที่ยว", "trip", "travel", "#เที่ยว"],
  },
  {
    slug: "food",
    markers: ["กิน", "อาหาร", "ร้าน", "ชิม", "บุฟเฟ่ต์", "mukbang", "เมนู"],
  },
  {
    slug: "talk",
    markers: ["สัมภาษณ์", "ตอบคำถาม", "คุย", "เล่าเรื่อง", "q&a", "podcast", "ep."],
  },
]

function haystack(
  title: string | null | undefined,
  description?: string | null,
  tags?: string[] | null,
) {
  return [title ?? "", description?.slice(0, 400) ?? "", (tags ?? []).join(" ")]
    .join(" ")
    .toLowerCase()
}

export function classifyContent(
  title: string | null | undefined,
  description?: string | null,
  tags?: string[] | null,
): string {
  const text = haystack(title, description, tags)

  for (const rule of SERIES) {
    if (rule.markers.some((m) => text.includes(m))) return rule.slug
  }
  for (const rule of FALLBACK) {
    if (rule.markers.some((m) => text.includes(m))) return rule.slug
  }
  return "other"
}

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return []
  // \p{M} keeps Thai vowel signs and tone marks attached to the base letter;
  // without it #ก้อยนัตตี้ดรีม truncates to #ก.
  const found = text.match(/#[\p{L}\p{M}\p{N}_]+/gu) ?? []
  return [...new Set(found.map((t) => t.toLowerCase()))]
}

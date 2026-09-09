/**
 * Reads the commenter's own age out of a Thai YouTube comment.
 *
 * WHY THIS IS NOT A KEYWORD LIST
 * The obvious approach — match ยาย, ลูกสาว, เงินเดือน and call it a cohort —
 * measures who is being TALKED ABOUT, not who is watching. Calibrated against
 * 21,780 comments on 231 Thai videos, a bare keyword list put 6.22% of comments
 * in a cohort, but the matches were dominated by third-person talk: "สอนลูกชาย
 * ได้ดีจริงๆ" (about a guest), "สามีอายุ65ปี" (about a husband), "สมมงลูกสาว
 * แห่งชาติ" (about an idol). Those are worthless as an audience read.
 *
 * So an age claim is only counted when the nearest referent before it is the
 * speaker. "ผมอายุ 27" counts; "สามีอายุ 65" does not, because สามี sits closer
 * to the number than any first-person pronoun. That cut the yield to ~0.6% of
 * comments and left the matches almost entirely genuine self-reports. The page
 * is built to state that thinness rather than hide it.
 *
 * Everything here is deliberately in TypeScript, not SQL: the referent logic is
 * the part most likely to need tuning, and this way it can be re-run over a
 * cached corpus without touching the database.
 */

/** Age bands, wide enough that a one-year mis-read cannot move a comment. */
export type CohortBand = "teen" | "uni" | "working" | "midlife" | "senior"

/** How the band was established. Stated age is the strongest evidence we get. */
export type CohortEvidence = "stated-age" | "life-stage"

export interface CohortRead {
  band: CohortBand
  evidence: CohortEvidence
  /** Present only for stated-age reads. */
  age: number | null
  /** A parenting role the commenter claims for themselves. Not an age band. */
  isParent: boolean
}

/** First-person reference. เค้า is included: colloquially it is also "I". */
const FIRST = /(ผม|หนู|เรา|ฉัน|ชั้น|ดิฉัน|กระผม|กู|เค้า|ตัวเอง|ข้าพเจ้า)/g

/**
 * Anyone who is not the speaker. This is the list that does the real work —
 * every entry here is a referent that would otherwise steal the age claim.
 */
const THIRD =
  /(สามี|ภรรยา|เมีย|ผัว|ลูก|แม่|พ่อ|พี่|น้อง|ยาย|ย่า|ปู่|ตา|เพื่อน|แฟน|หลาน|น้า|อา|ป้า|ลุง|เขา|คุณ|พระ|ครู|อาจารย์|ญาติ|นาย|เด็ก|คนนั้น|คนนี้|ท่าน|มัน|เธอ|พิธีกร|แขก)/g

/** Bands from a stated age. Under 13 and over 95 are treated as typos. */
export function bandForAge(age: number): CohortBand | null {
  if (!Number.isFinite(age) || age < 13 || age > 95) return null
  if (age <= 19) return "teen"
  if (age <= 24) return "uni"
  if (age <= 39) return "working"
  if (age <= 54) return "midlife"
  return "senior"
}

/**
 * A stated age that belongs to the speaker, or null.
 *
 * Each "อายุ NN" in the comment is tested against the 30 characters in front of
 * it. The claim is the speaker's when a first-person pronoun sits closer to the
 * number than any other person does, or when nobody else is named and the
 * phrasing is self-directed ("อายุ 30 ค่ะ", "ตอนนี้อายุ 34").
 */
export function statedAge(text: string): number | null {
  const re = /อายุ\s*(\d{1,2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const age = Number(m[1])
    if (!bandForAge(age)) continue

    const before = text.slice(Math.max(0, m.index - 30), m.index)
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 14)

    const lastFirst = [...before.matchAll(FIRST)].pop()
    const lastThird = [...before.matchAll(THIRD)].pop()
    const firstAt = lastFirst ? lastFirst.index + lastFirst[0].length : -1
    const thirdAt = lastThird ? lastThird.index + lastThird[0].length : -1

    // Nearest referent wins.
    if (firstAt > thirdAt) return age
    if (thirdAt >= 0) continue

    // Nobody named at all: accept only self-directed phrasing.
    if (/^(\s*ปี)?\s*(แล้ว|ค่ะ|ครับ|คับ|นะ|เอง|กว่า|ก็ยัง|ยัง)/.test(after)) return age
    if (/(ตอนนี้|ปีนี้|ปัจจุบัน|เพิ่ง|พอ|ตอน|จะ)\s*$/.test(before)) return age
  }
  return null
}

/**
 * Life-stage phrases that name the speaker by construction — the pronoun is
 * inside the pattern, so there is no referent to resolve. Only stages that map
 * to one age band are here; a parenting claim is a role and handled separately.
 */
const LIFE_STAGE: [CohortBand, RegExp][] = [
  [
    "teen",
    /(หนู|ผม|เรา|ฉัน)\s*(ก็|เพิ่ง|ยัง)?\s*(เรียน|อยู่)\s*ม\.?\s*[1-6]|(เรียน|อยู่)\s*ม\.?\s*[1-6]\s*(อยู่)?\s*(ค่ะ|ครับ|คับ)|(เด็ก)?มัธยมอย่าง(เรา|หนู|ผม)|(หนู|ผม|เรา)\s*ยังเรียน(อยู่|ม)|(หนู|ผม|เรา)\s*(เพิ่ง)?สอบเข้า(ม\.|มหา)/,
  ],
  [
    "uni",
    /(หนู|ผม|เรา|ฉัน)\s*(ก็|เพิ่ง|ยัง)?\s*(เรียน|อยู่|เข้า)\s*(มหาลัย|มหาวิทยาลัย)|นักศึกษาอย่าง(เรา|หนู|ผม)|(หนู|ผม|เรา|ฉัน)\s*(เพิ่ง|ก็)?\s*(ฝึกงาน|จบใหม่|เป็นเฟรชชี่|เป็นนักศึกษา)/,
  ],
  [
    "working",
    /มนุษย์เงินเดือน|เงินเดือน(ผม|หนู|เรา|ฉัน|ชั้น)|(ผม|หนู|เรา|ฉัน)\s*(ก็|เป็น|เพิ่ง)?\s*(ทำงานออฟฟิศ|เป็นพนักงาน|ทำงานบริษัท|เป็นข้าราชการ|เป็นพนง|ทำงานประจำ)|(ออฟฟิศ|เจ้านาย|ที่ทำงาน)(ผม|หนู|เรา|ฉัน)/,
  ],
  [
    "senior",
    /(ผม|เรา|ฉัน|หนู)\s*(ก็|เพิ่ง)?\s*เกษียณ(แล้ว)?|เกษียณแล้ว|อายุปูนนี้|(แก่|สูงอายุ)แล้ว\s*(ค่ะ|ครับ|คับ|นะ)|เป็น(ยาย|ย่า|ปู่|ตา)แล้ว|วัยทองอย่าง(เรา|ฉัน|ผม)|(ผม|เรา|ฉัน)\s*(นี่|ก็)?\s*อยู่ในวัยเกษียณ/,
  ],
]

/** Negated or hypothetical stage talk: "ไม่อยากเกษียณแล้ว" is not a retiree. */
const NEGATED =
  /(ไม่|ยังไม่|อยาก|จะ|ถ้า|เมื่อ|กว่าจะ|รอ)\s*[ก-๙]{0,6}(เกษียณ|แก่|มีลูก|ท้อง)/

export function lifeStage(text: string): CohortBand | null {
  if (NEGATED.test(text)) return null
  for (const [band, re] of LIFE_STAGE) if (re.test(text)) return band
  return null
}

/** A parenting role the speaker claims. Cuts across working and midlife. */
const PARENT =
  /ลูก(ผม|หนู|เรา|ฉัน|ชั้น)|ลูก(สาว|ชาย)(ผม|หนู|เรา|ฉัน)|ลูกของ(ผม|หนู|เรา|ฉัน)|(ผม|เรา|ฉัน|หนู)\s*(เพิ่ง|ก็)?\s*(คลอด|มีลูกแล้ว)|เป็น(แม่|พ่อ)คนแล้ว|(แม่|พ่อ)ลูก(หนึ่ง|สอง|สาม)/

export function claimsParent(text: string): boolean {
  return !NEGATED.test(text) && PARENT.test(text)
}

/**
 * The one call the ingest uses. Stated age beats life-stage phrasing whenever
 * both are present, because a number needs no interpretation.
 */
export function classifyCohort(text: string): CohortRead | null {
  const isParent = claimsParent(text)
  const age = statedAge(text)
  if (age !== null) {
    const band = bandForAge(age)
    if (band) return { band, evidence: "stated-age", age, isParent }
  }
  const stage = lifeStage(text)
  if (stage) return { band: stage, evidence: "life-stage", age: null, isParent }
  return null
}

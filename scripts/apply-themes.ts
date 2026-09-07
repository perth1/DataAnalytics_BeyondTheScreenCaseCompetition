/**
 * Applies a theme classification back onto posts.
 *
 *   npm run apply:themes
 *
 * Reads data/analysis/themes.txt — whitespace-separated "index:code" pairs
 * keyed to data/analysis/titles.tsv, where code is one of the letters in
 * THEME_CODES. Any index left out keeps its current theme.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()

import { createAdminClient } from "../lib/supabase/server"

const THEME_CODES: Record<string, string> = {
  a: "love",
  b: "friends",
  c: "life",
  d: "game",
  e: "travel",
  f: "food",
  g: "music",
  h: "celeb",
  i: "behind",
  j: "lifestyle",
  k: "product",
  l: "other",
}

async function main() {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  const db = createAdminClient()

  const titles = readFileSync(join("data", "analysis", "titles.tsv"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
  const byIndex = new Map(titles.map((cols) => [cols[0], cols[1]]))

  const raw = readFileSync(join("data", "analysis", "themes.txt"), "utf8")
  const pairs = raw.trim().split(/\s+/)

  const { data: themes } = await db.from("content_themes").select("id, slug")
  const themeId = new Map((themes ?? []).map((t) => [t.slug, t.id]))

  const bySlug = new Map<string, string[]>()
  const unknown: string[] = []

  for (const pair of pairs) {
    const [index, code] = pair.split(":")
    const externalId = byIndex.get(index)
    const slug = THEME_CODES[code]
    if (!externalId || !slug) {
      unknown.push(pair)
      continue
    }
    const list = bySlug.get(slug) ?? []
    list.push(externalId)
    bySlug.set(slug, list)
  }

  if (unknown.length > 0) {
    console.warn(`Skipped ${unknown.length} unparsable pairs, e.g. ${unknown.slice(0, 5).join(" ")}`)
  }

  let updated = 0
  for (const [slug, externalIds] of bySlug) {
    const id = themeId.get(slug)
    if (!id) throw new Error(`Unknown theme slug: ${slug}`)
    for (let i = 0; i < externalIds.length; i += 200) {
      const { error } = await db
        .from("posts")
        .update({ theme_id: id })
        .eq("platform", "youtube")
        .in("external_id", externalIds.slice(i, i + 200))
      if (error) throw error
    }
    updated += externalIds.length
    console.log(`  ${slug.padEnd(10)} ${externalIds.length}`)
  }

  console.log(`\nApplied ${updated} themes.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

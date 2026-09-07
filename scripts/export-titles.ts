/**
 * Dumps every post title for classification.
 *
 *   npm run export:titles
 *
 * Output is a TSV of index, external_id, format, category slug, views, title.
 * The index is the key used by scripts/apply-themes.ts, so the file must not be
 * reordered between export and import.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadEnv } from "../lib/env"

loadEnv()

import { createServerClient } from "../lib/supabase/server"

async function main() {
  const db = createServerClient()
  const rows: {
    external_id: string
    title: string | null
    format: string | null
    category_slug: string | null
    views: number | null
  }[] = []

  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("v_post_latest_metrics")
      .select("external_id, title, format, category_slug, views")
      .order("views", { ascending: false, nullsFirst: false })
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < 1000) break
  }

  const dir = join("data", "analysis")
  mkdirSync(dir, { recursive: true })
  const tsv = rows
    .map((r, i) =>
      [
        i + 1,
        r.external_id,
        r.format ?? "",
        r.category_slug ?? "",
        r.views ?? 0,
        (r.title ?? "").replace(/\s+/g, " "),
      ].join("\t"),
    )
    .join("\n")

  writeFileSync(join(dir, "titles.tsv"), tsv, "utf8")
  console.log(`Wrote ${rows.length} titles to ${join(dir, "titles.tsv")}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

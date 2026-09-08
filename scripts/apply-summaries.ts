/**
 * Upserts every analysis JSON in data/analysis/summaries/ into comment_summaries.
 *
 *   npm run apply:summaries
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY. Use this instead of build:summaries + SQL
 * when you just want the rows in the database.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()

import { createAdminClient } from "../lib/supabase/server"

const dir = join("data", "analysis", "summaries")

interface SummaryFile {
  post_id: string
  model?: string
  comment_count?: number
  summary: string
  themes?: { label: string; share: number; example?: string | null }[]
  sentiment_breakdown?: Record<string, number>
  audience_signals?: string[]
  content_requests?: string[]
}

async function main() {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!existsSync(dir)) {
    console.error(`No ${dir}.`)
    process.exit(1)
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  if (files.length === 0) {
    console.error(`No .json files in ${dir}.`)
    process.exit(1)
  }

  const rows = files.map((file) => {
    const d = JSON.parse(readFileSync(join(dir, file), "utf8")) as SummaryFile
    if (!d.post_id || !d.summary) {
      throw new Error(`${file}: post_id and summary are required`)
    }
    return {
      post_id: d.post_id,
      model: d.model ?? "claude-opus-5",
      summary: d.summary,
      themes: d.themes ?? [],
      sentiment_breakdown: d.sentiment_breakdown ?? {},
      audience_signals: d.audience_signals ?? [],
      content_requests: d.content_requests ?? [],
      comment_count: d.comment_count ?? 0,
      generated_at: new Date().toISOString(),
    }
  })

  const db = createAdminClient()
  const { error } = await db
    .from("comment_summaries")
    .upsert(rows, { onConflict: "post_id" })
  if (error) throw error

  console.log(`Upserted ${rows.length} summaries.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

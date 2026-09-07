/**
 * Turns analysis JSON files into an SQL file for comment_summaries.
 *
 *   npm run build:summaries
 *
 * Expects one JSON file per post in data/analysis/summaries/ shaped as:
 *
 * {
 *   "post_id": "uuid",
 *   "model": "claude-opus-5",
 *   "comment_count": 240,
 *   "summary": "...",
 *   "themes": [{ "label": "...", "share": 32, "example": "..." }],
 *   "sentiment_breakdown": { "positive": 70, "neutral": 20, "negative": 5, "mixed": 5 },
 *   "audience_signals": ["..."],
 *   "content_requests": ["..."]
 * }
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { buildInsert, lit } from "../lib/sql"

const dir = join("data", "analysis", "summaries")
const out = join("data", "analysis", "04-summaries.sql")

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

function main() {
  if (!existsSync(dir)) {
    console.error(`No ${dir}. Create it and add one JSON file per post.`)
    process.exit(1)
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"))
  if (files.length === 0) {
    console.error(`No .json files in ${dir}.`)
    process.exit(1)
  }

  const rows = files.map((file) => {
    const data = JSON.parse(readFileSync(join(dir, file), "utf8")) as SummaryFile
    if (!data.post_id || !data.summary) {
      throw new Error(`${file}: post_id and summary are required`)
    }
    return [
      lit(data.post_id),
      lit(data.model ?? "claude-opus-5"),
      lit(data.summary),
      lit(data.themes ?? []),
      lit(data.sentiment_breakdown ?? {}),
      lit(data.audience_signals ?? []),
      lit(data.content_requests ?? []),
      lit(data.comment_count ?? 0),
    ]
  })

  const sql = buildInsert({
    table: "comment_summaries",
    columns: [
      "post_id",
      "model",
      "summary",
      "themes",
      "sentiment_breakdown",
      "audience_signals",
      "content_requests",
      "comment_count",
    ],
    rows,
    conflict: "post_id",
    update: [
      "model",
      "summary",
      "themes",
      "sentiment_breakdown",
      "audience_signals",
      "content_requests",
      "comment_count",
    ],
  })

  writeFileSync(out, `${sql}\nupdate comment_summaries set generated_at = now();\n`, "utf8")
  console.log(`Wrote ${rows.length} summaries to ${out}`)
}

main()

/**
 * Exports the comments on mass-reach posts as markdown files for analysis.
 *
 *   npm run export:comments
 *   npm run export:comments -- --platform youtube --limit 20
 *
 * Reads through the public anon key, so no service-role key is needed.
 * Output lands in data/analysis/<platform>/<rank>-<slug>.md — one file per post,
 * ready to be read and summarised. Write the resulting analysis back as JSON in
 * data/analysis/summaries/, then run npm run build:summaries.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()

import { createServerClient } from "../lib/supabase/server"
import type { Platform } from "../lib/types"

const args = process.argv.slice(2)
function arg(name: string) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const platform = arg("platform") as Platform | undefined
const limit = Number(arg("limit") ?? 30)
const perPost = Number(arg("comments") ?? 300)

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const db = createServerClient()

  let query = db
    .from("v_post_latest_metrics")
    .select("id, external_id, title, platform, url, views, likes, comments, published_at, category_name")
    .eq("is_viral", true)
    .order("views", { ascending: false, nullsFirst: false })
    .limit(limit)
  if (platform) query = query.eq("platform", platform)

  const { data: posts, error } = await query
  if (error) throw error
  if (!posts || posts.length === 0) {
    console.log("No mass-reach posts found. Apply the ingestion SQL first.")
    return
  }

  const index: string[] = [
    "# Comment analysis queue",
    "",
    "| # | Post | Platform | Views | Comments | File |",
    "| --- | --- | --- | --- | --- | --- |",
  ]

  for (const [i, post] of posts.entries()) {
    const { data: comments } = await db
      .from("post_comments")
      .select("author, text, like_count, published_at")
      .eq("post_id", post.id!)
      .order("like_count", { ascending: false })
      .limit(perPost)

    if (!comments || comments.length === 0) {
      console.log(`skip  ${post.title?.slice(0, 60)} (no comments)`)
      continue
    }

    const rank = String(i + 1).padStart(2, "0")
    const dir = join("data", "analysis", post.platform ?? "unknown")
    mkdirSync(dir, { recursive: true })
    const name = `${rank}-${slugify(post.title ?? post.external_id ?? "post")}.md`

    const body = [
      `# ${post.title ?? "(untitled)"}`,
      "",
      `- post_id: \`${post.id}\``,
      `- platform: ${post.platform}`,
      `- url: ${post.url}`,
      `- category: ${post.category_name ?? "Uncategorized"}`,
      `- published: ${post.published_at?.slice(0, 10) ?? "unknown"}`,
      `- views: ${Number(post.views ?? 0).toLocaleString()}`,
      `- likes: ${Number(post.likes ?? 0).toLocaleString()}`,
      `- comments on platform: ${Number(post.comments ?? 0).toLocaleString()}`,
      `- comments exported: ${comments.length}`,
      "",
      "## Comments (most liked first)",
      "",
      ...comments.map(
        (c, n) =>
          `${n + 1}. [${c.like_count ?? 0} likes] **${c.author ?? "anonymous"}** — ${c.text.replace(/\s+/g, " ")}`,
      ),
      "",
    ].join("\n")

    writeFileSync(join(dir, name), body, "utf8")
    index.push(
      `| ${rank} | ${post.title?.replace(/\|/g, "-").slice(0, 60)} | ${post.platform} | ${Number(post.views ?? 0).toLocaleString()} | ${comments.length} | \`${join(dir, name)}\` |`,
    )
    console.log(`ok    ${join(dir, name)} (${comments.length} comments)`)
  }

  mkdirSync(join("data", "analysis"), { recursive: true })
  writeFileSync(join("data", "analysis", "INDEX.md"), index.join("\n"), "utf8")
  console.log(`\nQueue written to data/analysis/INDEX.md`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

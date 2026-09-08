/**
 * Exports the comments on the top N posts of every series as markdown files,
 * one file per post, grouped into a folder per series. This mirrors the
 * "Top 10 by series" table in the UI — that list defines the analysis queue.
 *
 *   npm run export:comments
 *   npm run export:comments -- --top 10 --comments 80
 *   npm run export:comments -- --series music,travel
 *
 * Reads through the public anon key, so no service-role key is needed.
 * Write the resulting analysis back as JSON in data/analysis/summaries/, then
 * run npm run build:summaries.
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
const platform = (arg("platform") ?? "youtube") as Platform
const topN = Number(arg("top") ?? 10)
const perPost = Number(arg("comments") ?? 80)
const onlySeries = arg("series")?.split(",").map((s) => s.trim())

const PAGE = 1000

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
}

interface Row {
  id: string
  external_id: string | null
  title: string | null
  platform: Platform
  url: string
  views: number | null
  likes: number | null
  comments: number | null
  published_at: string | null
  category_slug: string | null
  category_name: string | null
  theme_name: string | null
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const db = createServerClient()

  // PostgREST caps a single response at 1000 rows, so page through the posts.
  const all: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("v_post_latest_metrics")
      .select(
        "id, external_id, title, platform, url, views, likes, comments, published_at, category_slug, category_name, theme_name",
      )
      .eq("platform", platform)
      .order("external_id")
      .range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...((data ?? []) as Row[]))
    if (!data || data.length < PAGE) break
  }

  if (all.length === 0) {
    console.log("No posts found. Run the ingestion first.")
    return
  }

  const bySeries = new Map<string, { name: string; posts: Row[] }>()
  for (const p of all) {
    const slug = p.category_slug ?? "uncategorized"
    if (onlySeries && !onlySeries.includes(slug)) continue
    const group = bySeries.get(slug) ?? {
      name: p.category_name ?? "Uncategorized",
      posts: [],
    }
    group.posts.push(p)
    bySeries.set(slug, group)
  }

  const groups = [...bySeries.entries()]
    .map(([slug, g]) => ({
      slug,
      name: g.name,
      totalViews: g.posts.reduce((s, p) => s + Number(p.views ?? 0), 0),
      top: [...g.posts]
        .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
        .slice(0, topN),
    }))
    .sort((a, b) => b.totalViews - a.totalViews)

  const index: string[] = [
    "# Comment analysis queue",
    "",
    `Top ${topN} posts per series on ${platform}, up to ${perPost} most-liked comments each.`,
    "",
  ]
  let exported = 0

  for (const group of groups) {
    const dir = join("data", "analysis", platform, group.slug)
    mkdirSync(dir, { recursive: true })

    index.push(
      `## ${group.name} (\`${group.slug}\`)`,
      "",
      "| # | Post | Views | Comments | File |",
      "| --- | --- | --- | --- | --- |",
    )

    for (const [i, post] of group.top.entries()) {
      const { data: comments } = await db
        .from("post_comments")
        .select("author, text, like_count, published_at")
        .eq("post_id", post.id)
        .order("like_count", { ascending: false })
        .limit(perPost)

      const rank = String(i + 1).padStart(2, "0")
      if (!comments || comments.length === 0) {
        index.push(
          `| ${rank} | ${post.title?.replace(/\|/g, "-").slice(0, 60)} | ${Number(post.views ?? 0).toLocaleString()} | 0 | — no comments stored |`,
        )
        continue
      }

      const name = `${rank}-${slugify(post.title ?? post.external_id ?? "post")}.md`
      const body = [
        `# ${post.title ?? "(untitled)"}`,
        "",
        `- post_id: \`${post.id}\``,
        `- platform: ${post.platform}`,
        `- url: ${post.url}`,
        `- series: ${group.name}`,
        `- theme: ${post.theme_name ?? "Unclassified"}`,
        `- series rank: ${i + 1} of top ${group.top.length}`,
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
      exported += 1
      index.push(
        `| ${rank} | ${post.title?.replace(/\|/g, "-").slice(0, 60)} | ${Number(post.views ?? 0).toLocaleString()} | ${comments.length} | \`${join(dir, name)}\` |`,
      )
    }

    index.push("")
    console.log(`${group.slug.padEnd(20)} ${group.top.length} posts`)
  }

  mkdirSync(join("data", "analysis"), { recursive: true })
  writeFileSync(join("data", "analysis", "INDEX.md"), index.join("\n"), "utf8")
  console.log(
    `\n${exported} files written across ${groups.length} series. Queue: data/analysis/INDEX.md`,
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

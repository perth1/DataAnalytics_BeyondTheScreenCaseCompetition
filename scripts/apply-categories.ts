/**
 * Re-runs series classification over posts already in the database.
 *
 *   npm run apply:categories
 *
 * Uses the stored title and hashtags — hashtags were extracted from title plus
 * description at ingest time, so the description signal survives even though the
 * text itself is not stored.
 */
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()

import { createAdminClient } from "../lib/supabase/server"
import { classifyContent } from "../lib/classify"

async function main() {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  const db = createAdminClient()

  const { data: categories } = await db.from("content_categories").select("id, slug")
  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]))

  const posts: { external_id: string; title: string | null; hashtags: string[] | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("posts")
      .select("external_id, title, hashtags")
      .eq("platform", "youtube")
      .order("external_id")
      .range(from, from + 999)
    if (error) throw error
    posts.push(...((data ?? []) as typeof posts))
    if (!data || data.length < 1000) break
  }
  console.log(`Classifying ${posts.length} posts...`)

  const bySlug = new Map<string, string[]>()
  for (const post of posts) {
    const slug = classifyContent(post.title, null, post.hashtags)
    const list = bySlug.get(slug) ?? []
    list.push(post.external_id)
    bySlug.set(slug, list)
  }

  const ordered = [...bySlug.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [slug, ids] of ordered) {
    const id = categoryId.get(slug)
    if (!id) throw new Error(`Missing content_categories row for "${slug}"`)
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db
        .from("posts")
        .update({ category_id: id })
        .eq("platform", "youtube")
        .in("external_id", ids.slice(i, i + 200))
      if (error) throw error
    }
    const pct = ((ids.length / posts.length) * 100).toFixed(1)
    console.log(`  ${slug.padEnd(18)} ${String(ids.length).padStart(5)}  ${pct.padStart(5)}%`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

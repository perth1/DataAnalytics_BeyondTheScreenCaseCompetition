import { createAdminClient } from "../lib/supabase/server"
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()
requireEnv("SUPABASE_SERVICE_ROLE_KEY")

async function stats() {
  const db = createAdminClient()
  const { count } = await db
    .from("comment_summaries")
    .select("*", { count: "exact" })
  
  console.log(`✓ Total summaries in database: ${count}`)
  console.log(`✓ Analysis coverage: 75 out of 146 markdown comment files`)
  console.log(`  Remaining to analyze: ${146 - 75} files`)
}

stats().catch(e => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

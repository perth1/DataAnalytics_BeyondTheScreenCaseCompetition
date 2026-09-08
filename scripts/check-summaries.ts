import { createAdminClient } from "../lib/supabase/server"
import { loadEnv, requireEnv } from "../lib/env"

loadEnv()
requireEnv("SUPABASE_SERVICE_ROLE_KEY")

async function check() {
  const db = createAdminClient()
  const { count } = await db
    .from("comment_summaries")
    .select("*", { count: "exact" })
  
  console.log(`✓ Summaries in database: ${count}`)
}

check().catch(e => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

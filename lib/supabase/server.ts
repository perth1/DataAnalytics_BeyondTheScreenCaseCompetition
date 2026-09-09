import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

let readClient: SupabaseClient | null = null

/**
 * Read-only server client. No auth in this app - anon key + RLS read policies.
 *
 * Held for the life of the process rather than rebuilt per query: a page draws
 * from a dozen of these and the client carries no per-request state, so a fresh
 * one each time only re-paid the construction cost.
 */
export function createServerClient() {
  readClient ??= createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  return readClient
}

/** Service-role client for ingestion scripts and write routes. Server only. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

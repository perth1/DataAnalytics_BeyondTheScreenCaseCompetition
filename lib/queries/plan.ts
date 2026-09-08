import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { PlanBoard, PlanCard } from "@/lib/types"

export async function getBoards(): Promise<PlanBoard[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("plan_boards")
    .select("*")
    .order("sort_order")
  return data ?? []
}

/** Every card on every board — one round trip for the stacked Plan page. */
export async function getAllCards(): Promise<PlanCard[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("plan_cards")
    .select("*")
    .order("sort_order")
    .order("created_at")
  return data ?? []
}


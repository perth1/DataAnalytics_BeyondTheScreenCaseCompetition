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

export async function getBoard(framework: string): Promise<PlanBoard | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await createServerClient()
    .from("plan_boards")
    .select("*")
    .eq("framework", framework)
    .maybeSingle()
  return data ?? null
}

export async function getCards(boardId: string): Promise<PlanCard[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("plan_cards")
    .select("*")
    .eq("board_id", boardId)
    .order("sort_order")
    .order("created_at")
  return data ?? []
}

export async function getCardCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {}
  const { data } = await createServerClient().from("plan_cards").select("board_id")
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.board_id] = (counts[row.board_id] ?? 0) + 1
  }
  return counts
}

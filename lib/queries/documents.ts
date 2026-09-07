import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { DocumentRef } from "@/lib/types"

export async function getDocuments(): Promise<DocumentRef[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("documents")
    .select("*")
    .order("sort_order")
    .order("created_at")
  return data ?? []
}

export async function getDocument(id: string): Promise<DocumentRef | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await createServerClient()
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data ?? null
}

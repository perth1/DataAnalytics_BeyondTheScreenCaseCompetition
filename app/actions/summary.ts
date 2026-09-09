"use server"

import { getSummarySummary } from "@/lib/queries/analytics"
import type { CommentSummary } from "@/lib/types"

/**
 * Fetch one post's comment summary for the series table's row expansion.
 *
 * The table is a client component and used to import the query module
 * directly, which meant the whole Supabase client — 238 kB of JavaScript —
 * shipped to the browser so that one click could run one lookup. Going through
 * a server action keeps the query, and the driver, on the server.
 */
export async function fetchCommentSummary(
  postId: string,
): Promise<CommentSummary | null> {
  return getSummarySummary(postId)
}

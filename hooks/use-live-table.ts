"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Refreshes the current route when another person changes one of these tables.
 * The app has no login, so several editors share one anon identity — a broadcast
 * refresh is enough, there is nothing per-user to reconcile.
 */
export function useLiveTables(tables: string[]) {
  const router = useRouter()
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`live:${tables.join("-")}`)

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // Coalesce bursts (a drag, a paste of several cards) into one refresh.
          if (pending.current) clearTimeout(pending.current)
          pending.current = setTimeout(() => router.refresh(), 250)
        },
      )
    }

    channel.subscribe()

    return () => {
      if (pending.current) clearTimeout(pending.current)
      supabase.removeChannel(channel)
    }
  }, [router, tables])
}

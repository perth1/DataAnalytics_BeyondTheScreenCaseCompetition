"use client"

import { useMemo } from "react"
import { useLiveTables } from "@/hooks/use-live-table"

/** Keeps every open board in sync while the team edits it together. */
export function LiveBoard() {
  const tables = useMemo(() => ["plan_cards", "plan_boards"], [])
  useLiveTables(tables)
  return null
}

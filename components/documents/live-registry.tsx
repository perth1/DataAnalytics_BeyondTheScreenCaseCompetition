"use client"

import { useMemo } from "react"
import { useLiveTables } from "@/hooks/use-live-table"

export function LiveRegistry() {
  const tables = useMemo(() => ["documents"], [])
  useLiveTables(tables)
  return null
}

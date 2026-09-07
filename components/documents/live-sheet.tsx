"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SheetData {
  headers: string[]
  rows: string[][]
  fetchedAt: string
}

const REFRESH_MS = 60_000

export function LiveSheet({
  fileId,
  gid,
}: {
  fileId: string
  gid?: string | null
}) {
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ fileId })
      if (gid) params.set("gid", gid)
      const res = await fetch(`/api/google/sheet?${params}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load sheet")
      setData(json as SheetData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [fileId, gid])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed px-5 py-8 text-center">
        <p className="text-sm font-medium">{error}</p>
        <p className="text-muted-foreground text-xs">
          Open the sheet in Google, then Share and set General access to anyone
          with the link.
        </p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw /> Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-xl border px-5 py-8 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading sheet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
        <span>
          {data.rows.length} rows · synced{" "}
          {new Date(data.fetchedAt).toLocaleTimeString("en-GB")}
        </span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
      </div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {data.headers.map((header, i) => (
                <TableHead key={`${header}-${i}`} className="whitespace-nowrap">
                  {header || `Column ${i + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, i) => (
              <TableRow key={i}>
                {data.headers.map((_, col) => (
                  <TableCell key={col} className="align-top">
                    {row[col] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const REFRESH_MS = 60_000

/** Renders the exported text of a Google Doc, refreshed on an interval. */
export function LiveDoc({ fileId }: { fileId: string }) {
  const [text, setText] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/google/doc?fileId=${fileId}`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load document")
      setText(json.text as string)
      setFetchedAt(json.fetchedAt as string)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [fileId])

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
          The embedded view below still works for documents shared inside the
          organisation.
        </p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw /> Retry
        </Button>
      </div>
    )
  }

  if (text === null) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-xl border px-5 py-8 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading document
      </div>
    )
  }

  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0)

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
        <span>
          synced{" "}
          {fetchedAt ? new Date(fetchedAt).toLocaleTimeString("en-GB") : "—"}
        </span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
      </div>
      <article className="rounded-xl border px-6 py-6 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-[68ch] space-y-4">
          {blocks.map((block, i) => (
            <p key={i} className="text-sm leading-7 whitespace-pre-wrap">
              {block}
            </p>
          ))}
        </div>
      </article>
    </div>
  )
}

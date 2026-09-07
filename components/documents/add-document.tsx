"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { detectKind, parseGoogleFileId } from "@/lib/google"
import { cn } from "@/lib/utils"

export function AddDocument() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const kind = detectKind(url)
      const { error } = await createClient()
        .from("documents")
        .insert({
          title: title.trim() || url,
          url: url.trim(),
          kind,
          google_file_id: parseGoogleFileId(url),
          description: description.trim() || null,
        })
      if (error) throw error
      setUrl("")
      setTitle("")
      setDescription("")
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const field =
    "border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> Add document
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-3 rounded-xl border p-4 sm:w-[420px]"
    >
      <input
        className={field}
        placeholder="Google Docs / Sheets / Slides URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <input
        className={field}
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className={field}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <p className={cn("text-muted-foreground text-xs leading-relaxed")}>
        Set link sharing to anyone with the link so the content can be rendered
        natively and stay in sync.
      </p>
    </form>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  Presentation,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import type { DocumentKind, DocumentRef } from "@/lib/types"

const ICONS: Record<DocumentKind, typeof FileText> = {
  gdoc: FileText,
  gsheet: FileSpreadsheet,
  gslide: Presentation,
  pdf: FileText,
  link: Link2,
}

const LABELS: Record<DocumentKind, string> = {
  gdoc: "Google Doc",
  gsheet: "Google Sheet",
  gslide: "Slides",
  pdf: "PDF",
  link: "Link",
}

export function DocumentCard({ doc }: { doc: DocumentRef }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const Icon = ICONS[doc.kind]

  async function remove() {
    setDeleting(true)
    await createClient().from("documents").delete().eq("id", doc.id)
    router.refresh()
  }

  return (
    <div className="hover:bg-muted/40 group relative rounded-xl border p-5 transition-colors">
      <Link href={`/documents/${doc.id}`} className="block space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Icon className="text-muted-foreground size-4 shrink-0" />
          <Badge variant="muted">{LABELS[doc.kind]}</Badge>
        </div>
        <p className="line-clamp-2 text-sm font-medium">{doc.title}</p>
        {doc.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {doc.description}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Added {formatDate(doc.updated_at)}
        </p>
      </Link>

      <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="hover:bg-muted rounded-md p-1.5"
          aria-label="Open in Google"
        >
          <ExternalLink className="size-3.5" />
        </a>
        <button
          onClick={remove}
          disabled={deleting}
          className="hover:bg-muted rounded-md p-1.5"
          aria-label="Remove document"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

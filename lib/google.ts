import type { DocumentKind } from "@/lib/types"

/** Pulls the file id out of any Google Docs / Sheets / Slides URL. */
export function parseGoogleFileId(url: string): string | null {
  const m = /\/d\/(?:e\/)?([a-zA-Z0-9_-]{20,})/.exec(url)
  if (m) return m[1]
  const q = /[?&]id=([a-zA-Z0-9_-]{20,})/.exec(url)
  return q ? q[1] : null
}

export function parseGid(url: string): string | null {
  const m = /[#&?]gid=(\d+)/.exec(url)
  return m ? m[1] : null
}

export function detectKind(url: string): DocumentKind {
  if (url.includes("docs.google.com/document")) return "gdoc"
  if (url.includes("docs.google.com/spreadsheets")) return "gsheet"
  if (url.includes("docs.google.com/presentation")) return "gslide"
  if (url.toLowerCase().endsWith(".pdf")) return "pdf"
  return "link"
}

/** Embed URL that stays in sync with the live document. */
export function embedUrl(kind: DocumentKind, fileId: string, gid?: string | null) {
  switch (kind) {
    case "gdoc":
      return `https://docs.google.com/document/d/${fileId}/preview`
    case "gsheet":
      return `https://docs.google.com/spreadsheets/d/${fileId}/preview${gid ? `#gid=${gid}` : ""}`
    case "gslide":
      return `https://docs.google.com/presentation/d/${fileId}/embed`
    default:
      return null
  }
}

/** CSV export endpoint. Works for any sheet shared as "anyone with the link". */
export function sheetCsvUrl(fileId: string, gid?: string | null) {
  const base = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`
  return gid ? `${base}&gid=${gid}` : base
}

/** Plain-text export for a Doc shared as "anyone with the link". */
export function docTextUrl(fileId: string) {
  return `https://docs.google.com/document/d/${fileId}/export?format=txt`
}

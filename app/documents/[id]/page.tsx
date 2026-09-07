import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { buttonVariants } from "@/components/ui/button"
import { LiveDoc } from "@/components/documents/live-doc"
import { LiveSheet } from "@/components/documents/live-sheet"
import { EmbedFrame } from "@/components/documents/embed-frame"
import { getDocument } from "@/lib/queries/documents"
import { embedUrl, parseGid, parseGoogleFileId } from "@/lib/google"

export const dynamic = "force-dynamic"

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) notFound()

  const fileId = doc.google_file_id ?? parseGoogleFileId(doc.url)
  const gid = parseGid(doc.url)
  const embed = fileId ? embedUrl(doc.kind, fileId, gid) : null

  return (
    <PageShell
      title={doc.title}
      description={doc.description ?? undefined}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft /> Documents
          </Link>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open in Google <ExternalLink />
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        {doc.kind === "gsheet" && fileId && <LiveSheet fileId={fileId} gid={gid} />}
        {doc.kind === "gdoc" && fileId && <LiveDoc fileId={fileId} />}

        {embed && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Embedded view
            </h2>
            <EmbedFrame src={embed} title={doc.title} />
          </section>
        )}

        {!embed && (
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="hover:bg-muted/40 block rounded-xl border px-5 py-8 text-center text-sm transition-colors"
          >
            Open {doc.url}
          </a>
        )}
      </div>
    </PageShell>
  )
}

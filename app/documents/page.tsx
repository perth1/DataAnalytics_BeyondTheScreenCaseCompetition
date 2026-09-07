import { FolderOpen } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { AddDocument } from "@/components/documents/add-document"
import { DocumentCard } from "@/components/documents/document-card"
import { LiveRegistry } from "@/components/documents/live-registry"
import { getDocuments } from "@/lib/queries/documents"

export const dynamic = "force-dynamic"

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <PageShell
      title="Documents"
      description="Google Docs, Sheets, and reference links — rendered live from source"
      actions={<AddDocument />}
    >
      <LiveRegistry />
      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents registered"
          description="Paste a Google Docs or Sheets URL to register it. The content is read from the live file every time the page opens, so it always matches the source."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

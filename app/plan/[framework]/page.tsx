import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { buttonVariants } from "@/components/ui/button"
import { BoardColumn } from "@/components/plan/board-column"
import { LiveBoard } from "@/components/plan/live-board"
import { getBoard, getCards } from "@/lib/queries/plan"
import { FRAMEWORK_MAP, FRAMEWORKS } from "@/lib/plan-frameworks"

export const dynamic = "force-dynamic"

export default async function BoardPage({
  params,
}: {
  params: Promise<{ framework: string }>
}) {
  const { framework } = await params
  const meta = FRAMEWORK_MAP[framework]
  if (!meta) notFound()

  const board = await getBoard(framework)
  if (!board) notFound()

  const cards = await getCards(board.id)

  return (
    <PageShell
      title={board.title}
      description={board.description ?? meta.description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/plan"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft /> Boards
          </Link>
          {FRAMEWORKS.filter((f) => f.slug !== framework).map((f) => (
            <Link
              key={f.slug}
              href={`/plan/${f.slug}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {f.title}
            </Link>
          ))}
        </div>
      }
    >
      <LiveBoard />
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {meta.columns.map((column) => (
          <BoardColumn
            key={column.key}
            boardId={board.id}
            column={column}
            cards={cards.filter((c) => c.column_key === column.key)}
          />
        ))}
      </div>
    </PageShell>
  )
}

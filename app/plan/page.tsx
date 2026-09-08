import { Target } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { BoardColumn } from "@/components/plan/board-column"
import { LiveBoard } from "@/components/plan/live-board"
import { getAllCards, getBoards } from "@/lib/queries/plan"
import { FRAMEWORK_MAP } from "@/lib/plan-frameworks"

export const dynamic = "force-dynamic"

export default async function PlanPage() {
  const [boards, cards] = await Promise.all([getBoards(), getAllCards()])

  // A board whose framework is not defined in code has no columns to render.
  const sections = boards.flatMap((board) => {
    const framework = FRAMEWORK_MAP[board.framework]
    return framework ? [{ board, framework }] : []
  })

  return (
    <PageShell
      title="Plan"
      description="Every strategy framework on one page — scroll down to work through them in order"
    >
      <LiveBoard />
      {sections.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No boards yet"
          description="Run supabase/migrations/0002_seed.sql to load the SWOT, 3C, Audience Insight, Content Pillar, and Strategy Flow boards."
        />
      ) : (
        <div className="space-y-4">
          <nav className="flex flex-wrap gap-1.5">
            {sections.map(({ board }) => (
              <a
                key={board.id}
                href={`#${board.framework}`}
                className="hover:bg-muted rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
              >
                {board.title}
              </a>
            ))}
          </nav>

          <div className="divide-y">
            {sections.map(({ board, framework }, index) => {
              const boardCards = cards.filter((c) => c.board_id === board.id)
              return (
                <section
                  key={board.id}
                  id={board.framework}
                  // Clears the fixed top navbar when jumped to from the anchors.
                  className="scroll-mt-28 space-y-4 py-8 first:pt-0"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-lg font-semibold tracking-tight">
                        <span className="text-muted-foreground mr-2 tabular-nums">
                          {index + 1}.
                        </span>
                        {board.title}
                      </h2>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {boardCards.length} cards
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {board.description ?? framework.description}
                    </p>
                  </div>

                  {/* Wraps instead of scrolling sideways, so the whole page reads
                      as one vertical flow. */}
                  <div className="flex flex-wrap gap-3">
                    {framework.columns.map((column) => (
                      <BoardColumn
                        key={column.key}
                        boardId={board.id}
                        column={column}
                        cards={boardCards.filter(
                          (c) => c.column_key === column.key,
                        )}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </PageShell>
  )
}

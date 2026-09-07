import Link from "next/link"
import { ArrowUpRight, Target } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { LiveBoard } from "@/components/plan/live-board"
import { getBoards, getCardCounts } from "@/lib/queries/plan"
import { FRAMEWORK_MAP } from "@/lib/plan-frameworks"

export const dynamic = "force-dynamic"

export default async function PlanPage() {
  const [boards, counts] = await Promise.all([getBoards(), getCardCounts()])

  return (
    <PageShell
      title="Plan"
      description="Strategy frameworks and brainstorm boards for the case competition"
    >
      <LiveBoard />
      {boards.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No boards yet"
          description="Run supabase/migrations/0002_seed.sql to load the SWOT, 3C, Audience Insight, Content Pillar, and Strategy Flow boards."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const framework = FRAMEWORK_MAP[board.framework]
            return (
              <Link
                key={board.id}
                href={`/plan/${board.framework}`}
                className="hover:bg-muted/40 flex flex-col gap-3 rounded-xl border p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{board.title}</span>
                  <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0" />
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {board.description}
                </p>
                <div className="text-muted-foreground mt-auto flex items-center gap-3 text-xs">
                  <span className="tabular-nums">
                    {counts[board.id] ?? 0} cards
                  </span>
                  {framework && (
                    <span className="tabular-nums">
                      {framework.columns.length} columns
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

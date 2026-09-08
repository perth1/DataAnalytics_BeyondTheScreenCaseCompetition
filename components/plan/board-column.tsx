"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { FrameworkColumn } from "@/lib/plan-frameworks"
import type { PlanCard } from "@/lib/types"

function CardItem({ card }: { card: PlanCard }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [body, setBody] = useState(card.body ?? "")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    await createClient()
      .from("plan_cards")
      .update({
        title: title.trim() || card.title,
        body: body.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
    setBusy(false)
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    setBusy(true)
    const { error } = await createClient()
      .from("plan_cards")
      .delete()
      .eq("id", card.id)
    setBusy(false)
    // A blocked delete comes back without throwing, so surface it rather than
    // leaving the card sitting there as if nothing was clicked.
    if (error) {
      window.alert(`Could not delete this card: ${error.message}`)
      return
    }
    router.refresh()
  }

  if (editing) {
    return (
      <div className="bg-card space-y-2 rounded-lg border p-3">
        <input
          autoFocus
          className="border-input h-8 w-full rounded-md border px-2 text-sm outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border-input min-h-20 w-full resize-y rounded-md border px-2 py-1.5 text-xs outline-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Detail, evidence, source"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            disabled={busy}
            className="hover:bg-muted rounded-md p-1.5"
            aria-label="Save"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="hover:bg-muted rounded-md p-1.5"
            aria-label="Cancel"
          >
            <X className="size-3.5" />
          </button>
          <button
            onClick={remove}
            className="hover:bg-muted ml-auto rounded-md p-1.5"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="bg-card hover:bg-muted/50 w-full space-y-1 rounded-lg border p-3 text-left transition-colors"
    >
      <p className="text-sm font-medium">{card.title}</p>
      {card.body && (
        <p className="text-muted-foreground text-xs whitespace-pre-wrap">
          {card.body}
        </p>
      )}
    </button>
  )
}

export function BoardColumn({
  boardId,
  column,
  cards,
}: {
  boardId: string
  column: FrameworkColumn
  cards: PlanCard[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    await createClient().from("plan_cards").insert({
      board_id: boardId,
      column_key: column.key,
      title: title.trim(),
      sort_order: cards.length,
    })
    setTitle("")
    setBusy(false)
    setAdding(false)
    router.refresh()
  }

  return (
    <section className="bg-muted/40 flex min-w-[260px] flex-1 flex-col gap-3 rounded-xl border p-3">
      <header className="space-y-0.5 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{column.label}</h3>
          <span className="text-muted-foreground text-xs tabular-nums">
            {cards.length}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">{column.hint}</p>
      </header>

      <div className="space-y-2">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </div>

      {adding ? (
        <form onSubmit={add} className="bg-card space-y-2 rounded-lg border p-3">
          <input
            autoFocus
            className="border-input h-8 w-full rounded-md border px-2 text-sm outline-none"
            placeholder="New card"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <button
              type="submit"
              disabled={busy}
              className="hover:bg-muted rounded-md p-1.5"
              aria-label="Add"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="hover:bg-muted rounded-md p-1.5"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:bg-card hover:text-foreground flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs transition-colors"
        >
          <Plus className="size-3.5" /> Add card
        </button>
      )}
    </section>
  )
}

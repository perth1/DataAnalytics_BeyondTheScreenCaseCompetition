import { cn } from "@/lib/utils"

interface StatTileProps {
  label: string
  value: string
  sub?: string
  className?: string
}

export function StatTile({ label, value, sub, className }: StatTileProps) {
  return (
    <div className={cn("rounded-xl border px-4 py-3.5", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  )
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </div>
  )
}

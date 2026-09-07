import { cn } from "@/lib/utils"

interface PageShellProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 pb-24", className)}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {actions}
      </header>
      <div className="pt-8">{children}</div>
    </div>
  )
}

import { cn } from "@/lib/utils"

interface ChartFrameProps {
  title: string
  caption?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function ChartFrame({
  title,
  caption,
  children,
  className,
  actions,
}: ChartFrameProps) {
  return (
    <figure className={cn("rounded-xl border", className)}>
      <figcaption className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {caption && (
            <p className="text-muted-foreground mt-0.5 text-xs">{caption}</p>
          )}
        </div>
        {actions}
      </figcaption>
      <div className="px-2 py-4 sm:px-4">{children}</div>
    </figure>
  )
}

import Link from "next/link"
import { cn } from "@/lib/utils"

export interface FormatOption {
  key: string
  label: string
  posts: number
}

/**
 * Format tabs, rendered only where a channel publishes more than one format.
 * The choice lives in the URL (`?format=short`) so the page stays server
 * rendered — the post list runs to a few thousand rows and has no business
 * crossing to the browser just to be filtered.
 */
export function FormatNav({
  basePath,
  options,
  active,
  total,
}: {
  basePath: string
  options: FormatOption[]
  active: string
  total: number
}) {
  const tabs = [{ key: "all", label: "ทั้งหมด", posts: total }, ...options]

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.key === "all" ? basePath : `${basePath}?format=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-transparent"
                : "hover:bg-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                isActive ? "opacity-70" : "text-muted-foreground",
              )}
            >
              {tab.posts.toLocaleString()}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

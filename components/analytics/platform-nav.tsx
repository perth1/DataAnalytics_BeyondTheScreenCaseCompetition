"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PLATFORMS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function PlatformNav() {
  const pathname = usePathname()

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto">
      <Link
        href="/analytics"
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
          pathname === "/analytics"
            ? "bg-primary text-primary-foreground border-transparent"
            : "hover:bg-muted",
        )}
      >
        ทุกแพลตฟอร์ม
      </Link>
      {PLATFORMS.map((p) => {
        const href = `/analytics/${p.key}`
        const active = pathname === href
        return (
          <Link
            key={p.key}
            href={href}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "hover:bg-muted",
            )}
          >
            {p.label}
          </Link>
        )
      })}
      {/* Cross-platform, so it sits after the per-platform tabs, not among them. */}
      <Link
        href="/analytics/market"
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
          pathname === "/analytics/market"
            ? "bg-primary text-primary-foreground border-transparent"
            : "hover:bg-muted",
        )}
      >
        ภาพรวมตลาด
      </Link>
    </nav>
  )
}

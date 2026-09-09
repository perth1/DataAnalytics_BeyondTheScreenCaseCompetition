"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname()

  const matched = items.find(
    (item) => item.url !== "#" && pathname.startsWith(item.url),
  )
  const [activeTab, setActiveTab] = useState(matched?.name ?? items[0].name)

  useEffect(() => {
    if (matched) setActiveTab(matched.name)
  }, [matched])

  // The lamp used to be a framer-motion shared-layout element, which meant
  // 122 kB of animation runtime in the first load of every page for one
  // sliding highlight. It is now a single positioned div: the active link is
  // measured and the lamp transitions to it in CSS. The items are different
  // widths, and different again once the labels collapse to icons, so the
  // measurement is what framer was really providing here.
  const barRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [lamp, setLamp] = useState<{ left: number; width: number } | null>(null)

  const measure = useCallback(() => {
    const el = itemRefs.current.get(activeTab)
    if (!el) return
    setLamp({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeTab])

  useEffect(() => {
    measure()
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === "undefined") return
    // Fires on viewport changes and on the label/icon swap at the md
    // breakpoint, both of which move every item.
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [measure])

  return (
    <div
      className={cn(
        // bottom-0 and top-0 together would stretch this fixed bar to the full
        // viewport height, and its z-50 column then swallows clicks down the
        // middle of every page — so the two edges stay mutually exclusive and
        // only the pill itself takes pointer events.
        "pointer-events-none fixed bottom-0 sm:bottom-auto sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:mb-0 sm:pt-6",
        className,
      )}
    >
      <div
        ref={barRef}
        className="pointer-events-auto relative flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg"
      >
        {lamp && (
          <div
            aria-hidden
            className="absolute top-1 bottom-1 left-0 bg-primary/5 rounded-full -z-10 transition-[transform,width] duration-300 ease-out"
            style={{
              width: lamp.width,
              transform: `translateX(${lamp.left}px)`,
            }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
              <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
              <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
              <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
            </div>
          </div>
        )}

        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              ref={(el) => {
                if (el) itemRefs.current.set(item.name, el)
                else itemRefs.current.delete(item.name)
              }}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-foreground/80 hover:text-primary",
                isActive && "bg-muted text-primary",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { BarChart3, FileText, Target } from "lucide-react"
import { NavBar, type NavItem } from "@/components/ui/tubelight-navbar"

const navItems: NavItem[] = [
  { name: "Analytics", url: "/analytics", icon: BarChart3 },
  { name: "Documents", url: "/documents", icon: FileText },
  { name: "Plan", url: "/plan", icon: Target },
]

export function SiteHeader() {
  return <NavBar items={navItems} />
}

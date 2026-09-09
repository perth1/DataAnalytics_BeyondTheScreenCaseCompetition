import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(digits)}%`
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

/**
 * Thai date, Gregorian year on purpose: th-TH defaults to the Buddhist era,
 * which would print 2569 beside metrics every reader thinks of as 2026.
 */
export function formatDateTh(value: string | Date | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

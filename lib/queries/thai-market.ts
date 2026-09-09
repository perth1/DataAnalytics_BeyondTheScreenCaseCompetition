import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { cachedRead } from "@/lib/cache"
import type {
  MarketCategoryScale,
  MarketChannelReach,
  MarketCohortCategory,
  MarketCohortFormat,
  MarketCohortTotal,
  MarketCohortTheme,
  MarketCohortVideo,
  MarketCoverage,
  MarketThemeScale,
} from "@/lib/types"

/**
 * Thai audience-market reads.
 *
 * Every one of these hits a view from migration 0011, so the classification of
 * ~200k comments happens once at ingest and the page only ever pulls a few
 * dozen aggregate rows. Comment text is fetched in exactly one place — the
 * evidence quotes — and never in bulk.
 */

async function readMarketCoverage(): Promise<MarketCoverage | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await createServerClient()
    .from("v_market_coverage")
    .select("*")
    .maybeSingle()
  return (data as MarketCoverage) ?? null
}

async function readCategoryScale(): Promise<MarketCategoryScale[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_category_scale")
    .select("*")
    .order("total_views", { ascending: false })
  return (data ?? []) as MarketCategoryScale[]
}

async function readThemeScale(): Promise<MarketThemeScale[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_theme_scale")
    .select("*")
    .order("total_views", { ascending: false })
  return (data ?? []) as MarketThemeScale[]
}

async function readCohortTotals(): Promise<MarketCohortTotal[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_cohort_totals")
    .select("*")
    .order("signals", { ascending: false })
  return (data ?? []) as MarketCohortTotal[]
}

async function readCohortCategories(): Promise<MarketCohortCategory[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_cohort_category")
    .select("*")
    .order("signals", { ascending: false })
  return (data ?? []) as MarketCohortCategory[]
}

async function readCohortThemes(): Promise<MarketCohortTheme[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_cohort_theme")
    .select("*")
    .order("signals", { ascending: false })
  return (data ?? []) as MarketCohortTheme[]
}

async function readCohortFormats(): Promise<MarketCohortFormat[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_cohort_format")
    .select("*")
  return (data ?? []) as MarketCohortFormat[]
}

async function readChannelReach(
  limit = 15,
): Promise<MarketChannelReach[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_channel_reach")
    .select("*")
    .order("corpus_views", { ascending: false })
    .limit(limit)
  return (data ?? []) as MarketChannelReach[]
}

/**
 * The videos each cohort commented on most. This is the traceability layer:
 * a claim like "senior viewers over-index on ธรรมะ" should be checkable
 * against the specific content that produced it.
 */
async function readCohortVideos(
  limitPerCohort = 5,
): Promise<MarketCohortVideo[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("v_market_cohort_videos")
    .select("*")
    .order("cohort_signals", { ascending: false })
    .limit(400)
  const rows = (data ?? []) as MarketCohortVideo[]

  const perCohort = new Map<string, MarketCohortVideo[]>()
  for (const r of rows) {
    const list = perCohort.get(r.cohort) ?? []
    if (list.length < limitPerCohort) {
      list.push(r)
      perCohort.set(r.cohort, list)
    }
  }
  return [...perCohort.values()].flat()
}

/**
 * A handful of the actual comments behind a cohort, newest-liked first. Kept
 * to a hard cap: the point is to show the reader what the evidence looks like,
 * not to ship the corpus to the browser.
 */
async function readCohortQuotes(
  cohort: string,
  limit = 4,
): Promise<{ text: string; stated_age: number | null; video_id: string }[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await createServerClient()
    .from("market_comments")
    .select("text, stated_age, video_id")
    .eq("cohort", cohort)
    .eq("evidence", "stated-age")
    .order("like_count", { ascending: false })
    .limit(limit)
  return (data ?? []) as {
    text: string
    stated_age: number | null
    video_id: string
  }[]
}

/**
 * Cached reads. These all hit pre-aggregated views over data that only moves
 * when an ingest runs, so they are memoised behind the ingest tag instead of
 * being recomputed in Postgres for every visitor.
 */
export const getMarketCoverage = cachedRead("market-coverage", readMarketCoverage)
export const getCategoryScale = cachedRead("category-scale", readCategoryScale)
export const getThemeScale = cachedRead("theme-scale", readThemeScale)
export const getCohortTotals = cachedRead("cohort-totals", readCohortTotals)
export const getCohortCategories = cachedRead("cohort-categories", readCohortCategories)
export const getCohortThemes = cachedRead("cohort-themes", readCohortThemes)
export const getCohortFormats = cachedRead("cohort-formats", readCohortFormats)
export const getChannelReach = cachedRead("channel-reach", readChannelReach)
export const getCohortVideos = cachedRead("cohort-videos", readCohortVideos)
export const getCohortQuotes = cachedRead("cohort-quotes", readCohortQuotes)

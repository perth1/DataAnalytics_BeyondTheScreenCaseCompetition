import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { cachedRead } from "@/lib/cache"
import type {
  CohortSeries,
  CohortTerritory,
  Platform,
  SignalCoverage,
  TerritoryDemand,
  TerritoryMomentum,
  TerritorySupply,
} from "@/lib/types"

/**
 * Market analysis reads.
 *
 * Every one of these hits a pre-aggregated view (migration 0008), so the
 * 25k-comment classification runs in Postgres and only a few dozen rows cross
 * the wire. Comment text is never selected.
 */

async function readTerritoryDemand(
  platform?: Platform,
): Promise<TerritoryDemand[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_territory_demand")
    .select("*")
    .order("signals", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as TerritoryDemand[]
}

async function readTerritorySupply(
  platform?: Platform,
): Promise<TerritorySupply[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_territory_supply")
    .select("*")
    .order("total_views", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as TerritorySupply[]
}

async function readCohortTerritories(
  platform?: Platform,
): Promise<CohortTerritory[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_cohort_territory")
    .select("*")
    .order("signals", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as CohortTerritory[]
}

async function readCohortSeries(
  platform?: Platform,
): Promise<CohortSeries[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_cohort_series")
    .select("*")
    .order("signals", { ascending: false })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as CohortSeries[]
}

async function readTerritoryMomentum(
  platform?: Platform,
): Promise<TerritoryMomentum[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient()
    .from("v_territory_momentum")
    .select("*")
    .order("year", { ascending: true })
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as TerritoryMomentum[]
}

async function readSignalCoverage(
  platform?: Platform,
): Promise<SignalCoverage[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient().from("v_signal_coverage").select("*")
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as SignalCoverage[]
}

/**
 * Cached reads. These all hit pre-aggregated views over data that only moves
 * when an ingest runs, so they are memoised behind the ingest tag instead of
 * being recomputed in Postgres for every visitor.
 */
export const getTerritoryDemand = cachedRead("territory-demand", readTerritoryDemand)
export const getTerritorySupply = cachedRead("territory-supply", readTerritorySupply)
export const getCohortTerritories = cachedRead("cohort-territories", readCohortTerritories)
export const getCohortSeries = cachedRead("cohort-series", readCohortSeries)
export const getTerritoryMomentum = cachedRead("territory-momentum", readTerritoryMomentum)
export const getSignalCoverage = cachedRead("signal-coverage", readSignalCoverage)

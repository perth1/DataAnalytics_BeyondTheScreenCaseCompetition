import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server"
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

export async function getTerritoryDemand(
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

export async function getTerritorySupply(
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

export async function getCohortTerritories(
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

export async function getCohortSeries(
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

export async function getTerritoryMomentum(
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

export async function getSignalCoverage(
  platform?: Platform,
): Promise<SignalCoverage[]> {
  if (!isSupabaseConfigured()) return []
  let query = createServerClient().from("v_signal_coverage").select("*")
  if (platform) query = query.eq("platform", platform)
  const { data } = await query
  return (data ?? []) as SignalCoverage[]
}

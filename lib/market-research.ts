/**
 * The published-research layer of the market page.
 *
 * WHY THIS LAYER EXISTS AT ALL
 * Measured age is not available to us. YouTube reports viewer age only through
 * the Analytics API, and only to the owner of the channel being measured, so no
 * amount of API work produces a demographic breakdown of the Thai market. What
 * our own ingest can read is age that viewers state about themselves in
 * comments, which is precise but rare — well under 1% of comments — and skewed
 * toward advice-seeking content.
 *
 * Published survey research answers the population-level question directly, so
 * the page carries both and keeps them apart. This file holds the survey side.
 *
 * THE RULE THAT MATTERS: the three sources use three different age schemes.
 * NBTC works in generations (Gen Z is 14–26), NSO in 6-14/15-24/25-39/40-59/60+,
 * and our own measurement in 13-19/20-24/25-39/40-54/55+. Converting between
 * them would require assuming a distribution inside each band, which would turn
 * survey findings into our own invention. So nothing here is harmonised: every
 * figure keeps the bands its source used, and band_scheme says which.
 */
import raw from "@/data/market/thai-audience-research.json"

export type BandScheme = "generation" | "nso" | "all-ages"

export interface ResearchSource {
  name: string
  name_en: string
  publisher: string
  year: number
  url: string
  /** Whether the link was verifiable. Unverified links are not presented as citations. */
  url_status: "verified" | "unverified"
  sample_size: string
  band_scheme: BandScheme
  note?: string
}

export interface ResearchRow {
  age_group: string
  generation?: string
  n?: number
  category: string
  value: number
}

export interface ResearchFigure {
  metric: string
  metric_th: string
  unit: "percent" | "million_people"
  source: string
  band_scheme: BandScheme
  note?: string
  rows: ResearchRow[]
}

export interface OmittedFigure {
  what: string
  source_name: string
  url: string
  why: string
}

interface ResearchFile {
  sources: Record<string, ResearchSource>
  figures: ResearchFigure[]
  omitted: OmittedFigure[]
}

const data = raw as unknown as ResearchFile

export const RESEARCH_SOURCES = data.sources
export const RESEARCH_OMITTED = data.omitted

export function figure(metric: string): ResearchFigure | null {
  return data.figures.find((f) => f.metric === metric) ?? null
}

export function sourceFor(figure: ResearchFigure): ResearchSource | null {
  return RESEARCH_SOURCES[figure.source] ?? null
}

/** Generation order, oldest cohort last, matching how the page reads age. */
const GENERATION_ORDER = ["Gen Z", "Gen Y", "Gen X", "Baby Boomer"]

/**
 * A figure pivoted into rows × columns for a heat table. Columns are the age
 * groups in age order; rows are whatever the figure measures (platforms,
 * content types). A missing cell stays missing rather than becoming a zero —
 * the NBTC report published only the leading categories per generation, and
 * printing 0% where the source printed nothing would be a fabrication.
 */
export function pivot(fig: ResearchFigure): {
  columns: { key: string; label: string; sub: string | null }[]
  rows: { label: string; cells: (number | null)[] }[]
} {
  const groups = [...new Set(fig.rows.map((r) => r.age_group))]
  const isGeneration = fig.band_scheme === "generation"

  groups.sort((a, b) => {
    if (!isGeneration) return parseInt(a) - parseInt(b)
    const ga = fig.rows.find((r) => r.age_group === a)?.generation ?? ""
    const gb = fig.rows.find((r) => r.age_group === b)?.generation ?? ""
    return GENERATION_ORDER.indexOf(ga) - GENERATION_ORDER.indexOf(gb)
  })

  const columns = groups.map((g) => {
    const sample = fig.rows.find((r) => r.age_group === g)
    return {
      key: g,
      label: sample?.generation ? `${sample.generation}` : g,
      sub: sample?.generation ? `${g} ปี · n=${sample.n ?? "?"}` : g,
    }
  })

  const rowLabels = [...new Set(fig.rows.map((r) => r.category))]
  const rows = rowLabels.map((label) => ({
    label,
    cells: groups.map(
      (g) =>
        fig.rows.find((r) => r.category === label && r.age_group === g)?.value ??
        null,
    ),
  }))

  return { columns, rows }
}

/** Reach as a share of the band's population, for the NSO figures. */
export function reachRows(): {
  ageGroup: string
  population: number
  internet: number
  mobile: number
  internetShare: number
}[] {
  const fig = figure("population-reach")
  if (!fig) return []
  const groups = [...new Set(fig.rows.map((r) => r.age_group))]
  return groups.map((g) => {
    const get = (cat: string) =>
      fig.rows.find((r) => r.age_group === g && r.category === cat)?.value ?? 0
    const population = get("ประชากร")
    const internet = get("ผู้ใช้อินเทอร์เน็ต")
    return {
      ageGroup: g,
      population,
      internet,
      mobile: get("ผู้ใช้โทรศัพท์มือถือ"),
      internetShare: population > 0 ? (internet / population) * 100 : 0,
    }
  })
}

import { Activity, Info } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import { DemandSupplyBars } from "@/components/analytics/demand-supply-bars"
import { TerritoryTable } from "@/components/analytics/territory-table"
import { MomentumGrid } from "@/components/analytics/momentum-grid"
import {
  CohortLeans,
  CohortMatrix,
} from "@/components/analytics/cohort-matrix"
import { EmptyState } from "@/components/ui/empty-state"
import {
  getCohortSeries,
  getCohortTerritories,
  getSignalCoverage,
  getTerritoryDemand,
  getTerritoryMomentum,
  getTerritorySupply,
} from "@/lib/queries/market"
import {
  cohortRows,
  momentumDelta,
  momentumYears,
  territoryRows,
  MIN_HEADLINE_POSTS,
  MIN_HEADLINE_SIGNALS,
  TERRITORIES,
} from "@/lib/market"
import { BRAND } from "@/lib/constants"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Comment history starts in 2020 but only thickens from 2022. */
const MOMENTUM_FROM_YEAR = 2022

export default async function MarketAnalysisPage() {
  const [demand, supply, cohortTerritories, cohortSeriesRows, momentum, coverage] =
    await Promise.all([
      getTerritoryDemand(),
      getTerritorySupply(),
      getCohortTerritories(),
      getCohortSeries(),
      getTerritoryMomentum(),
      getSignalCoverage(),
    ])

  const territories = territoryRows(demand, supply)
  const cohorts = cohortRows(cohortTerritories, cohortSeriesRows)
  const years = momentumYears(momentum, MOMENTUM_FROM_YEAR)

  const totals = coverage.reduce(
    (acc, c) => ({
      comments: acc.comments + Number(c.comments),
      territorySignals: acc.territorySignals + Number(c.territory_signals),
      cohortSignals: acc.cohortSignals + Number(c.cohort_signals),
      postsWithComments: acc.postsWithComments + Number(c.posts_with_comments),
    }),
    { comments: 0, territorySignals: 0, cohortSignals: 0, postsWithComments: 0 },
  )

  const catalogue = supply.reduce(
    (acc, s) => ({
      posts: acc.posts + Number(s.post_count),
      views: acc.views + Number(s.total_views),
    }),
    { posts: 0, views: 0 },
  )

  const hasData = totals.territorySignals > 0

  // Headline reads, all derived — nothing here is a hand-written finding.
  //
  // The residual reaction bucket is held out of all three opportunity
  // headlines. It wins every one of them on the lexicon alone (its markers are
  // reactions like ขำ and สนุก, which land on any video whatever its subject),
  // which would bury the territories the channel could actually act on. It
  // stays in the chart, the table, and the matrix below.
  const actionable = territories.filter((t) => !t.broad)

  const underServed = actionable
    .filter((t) => t.gap > 0)
    .sort((a, b) => b.gap - a.gap)
  const bestEngagement = [...actionable]
    .filter((t) => t.postCount >= MIN_HEADLINE_POSTS)
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0]
  // Empty until two years are on record, which also blanks the momentum card.
  const deltas = momentumDelta(years)
  const risers =
    deltas.size === 0
      ? []
      : TERRITORIES.filter((t) => !t.broad)
          .map((t) => ({ label: t.label, delta: deltas.get(t.slug) ?? 0 }))
          .sort((a, b) => b.delta - a.delta)
  const strongestLean = cohorts
    .flatMap((row) => row.leans.map((cell) => ({ row, cell })))
    .filter(({ cell }) => cell.signals >= MIN_HEADLINE_SIGNALS)
    .sort((a, b) => b.cell.index - a.cell.index)[0]

  const partialYear = years.length > 0 ? years[years.length - 1].year : undefined

  return (
    <PageShell
      title="Market Analysis"
      description={`${BRAND.subject} — where audience interest sits, and what each life stage cares about`}
      actions={<PlatformNav />}
    >
      {!hasData ? (
        <EmptyState
          icon={Activity}
          title="No comment signals yet"
          description="This page reads interest territories off ingested comments. Run npm run ingest:youtube -- --comments, then apply the 0008 and 0009 migrations in supabase/migrations."
        />
      ) : (
        <div className="space-y-8">
          <StatRow>
            <StatTile label="Total reach" value={formatCompact(catalogue.views)} />
            <StatTile label="Posts published" value={formatCompact(catalogue.posts)} />
            <StatTile
              label="Comments read"
              value={formatCompact(totals.comments)}
              sub={`${formatNumber(totals.postsWithComments)} posts sampled`}
            />
            <StatTile
              label="Interest signals"
              value={formatCompact(totals.territorySignals)}
              sub={`${formatPercent(
                (totals.territorySignals / totals.comments) * 100,
              )} of comments`}
            />
            <StatTile
              label="Life-stage signals"
              value={formatCompact(totals.cohortSignals)}
              sub={`${formatPercent(
                (totals.cohortSignals / totals.comments) * 100,
              )} of comments`}
            />
            <StatTile
              label="Territories"
              value={formatNumber(TERRITORIES.length)}
              sub="one shared lexicon"
            />
          </StatRow>

          <div className="flex gap-3 rounded-xl border px-5 py-4">
            <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="space-y-1.5 text-xs leading-relaxed">
              <p className="text-sm font-semibold tracking-tight">
                How this page is built
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">Demand</span> is
                counted in comment signals: every ingested comment is scored
                against a keyword lexicon of eight interest territories.{" "}
                <span className="text-foreground font-medium">Supply</span> is
                the same lexicon applied to the titles, descriptions, and
                hashtags of everything the channel published. Because both sides
                use one vocabulary, the gap between them is comparable rather
                than two unrelated rankings.
              </p>
              <p className="text-muted-foreground">
                Age is <span className="text-foreground font-medium">inferred</span>,
                never measured — YouTube&apos;s demographic splits need Analytics
                API access that only the channel owner has. Life stages come from
                language viewers volunteer about themselves (มัธยม, มนุษย์เงินเดือน,
                ลูกสาว, ยาย, เกษียณ), which only{" "}
                {formatPercent((totals.cohortSignals / totals.comments) * 100)} of
                comments do. Read the cohort section as a directional signal on a
                self-selected sample, not as a demographic measurement.
              </p>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {underServed[0] && (
              <div className="rounded-xl border p-5">
                <p className="text-muted-foreground text-xs">
                  Largest demand gap
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {underServed[0].label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  +{underServed[0].gap.toFixed(2)}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    pts
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatPercent(underServed[0].demandShare)} of audience
                  interest, {formatPercent(underServed[0].supplyShare)} of posts
                </p>
              </div>
            )}
            {bestEngagement && (
              <div className="rounded-xl border p-5">
                <p className="text-muted-foreground text-xs">
                  Best engagement rate
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {bestEngagement.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatPercent(bestEngagement.avgEngagementRate)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  across {formatNumber(bestEngagement.postCount)} posts averaging{" "}
                  {formatCompact(bestEngagement.avgViews)} views
                </p>
              </div>
            )}
            {risers[0] && (
              <div className="rounded-xl border p-5">
                <p className="text-muted-foreground text-xs">
                  Fastest-rising interest
                </p>
                <p className="mt-2 text-sm font-semibold">{risers[0].label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {risers[0].delta > 0 ? "+" : ""}
                  {risers[0].delta.toFixed(2)}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    pts
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  share of signals, {years[0]?.year} to{" "}
                  {years[years.length - 1]?.year}
                </p>
              </div>
            )}
            {strongestLean && (
              <div className="rounded-xl border p-5">
                <p className="text-muted-foreground text-xs">
                  Strongest cohort lean
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {strongestLean.row.meta.label} → {strongestLean.cell.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {strongestLean.cell.index.toFixed(1)}×
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  the life-stage-signalled average · n={strongestLean.cell.signals}{" "}
                  of{" "}
                  {formatNumber(strongestLean.row.signals)}
                </p>
              </div>
            )}
          </section>

          <p className="text-muted-foreground text-xs leading-relaxed">
            The three opportunity cards exclude{" "}
            {TERRITORIES.find((t) => t.broad)?.label}: its markers are reactions
            (ขำ, สนุก, ชอบมาก) that land on any video whatever its subject, so its
            demand share measures affect rather than a subject the channel could
            publish more of. It is still counted everywhere below.
          </p>

          <ChartFrame
            title="Audience demand vs content supply"
            caption="Where the audience's interest and the channel's output diverge"
          >
            <DemandSupplyBars
              data={territories.map((t) => ({
                name: t.label,
                demandShare: t.demandShare,
                supplyShare: t.supplyShare,
                signals: t.signals,
                postCount: t.postCount,
              }))}
            />
          </ChartFrame>

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                Interest territories
              </h2>
              <p className="text-muted-foreground text-xs">
                Demand share is of {formatNumber(totals.territorySignals)} comment
                signals; supply share is of classified posts only, since posts
                titled after a series or a guest carry no territory. A positive
                gap means the audience raises the subject more often than the
                channel publishes it.
              </p>
            </div>
            <div className="rounded-xl border">
              <TerritoryTable rows={territories} />
            </div>
          </section>

          {years.length >= 2 && (
            <ChartFrame
              title="Interest momentum"
              caption={`Share of comment signals per year, ${years[0].year}–${
                years[years.length - 1].year
              }`}
            >
              <MomentumGrid years={years} partialYear={partialYear} />
            </ChartFrame>
          )}

          {cohorts.length > 0 && (
            <>
              <section className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold tracking-tight">
                    What each life stage cares about
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Shaded by index — a cohort&apos;s share of a territory divided
                    by that territory&apos;s share across every life-stage-signalled
                    comment, so both sides carry the same self-selection. Every cohort talks about
                    entertainment most, so the index is what isolates a genuine
                    lean. Built on{" "}
                    {formatNumber(totals.cohortSignals)} comments that volunteer a
                    life-stage marker.
                  </p>
                </div>
                <div className="rounded-xl border px-3 py-4 sm:px-5">
                  <CohortMatrix rows={cohorts} />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Cohort profiles
                </h2>
                <CohortLeans rows={cohorts} />
              </section>
            </>
          )}

          <section className="space-y-2 rounded-xl border border-dashed px-5 py-4">
            <h2 className="text-sm font-semibold tracking-tight">
              Method and limits
            </h2>
            <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
              <li>
                — Comments are ingested for the top posts per series
                ({formatNumber(totals.postsWithComments)} of{" "}
                {formatNumber(catalogue.posts)} posts), so demand reflects the
                audience of mass-reach content, not the whole catalogue.
              </li>
              <li>
                — A keyword lexicon assigns one territory per comment, first match
                wins, specific territories before broad ones. It scores{" "}
                {formatPercent(
                  (totals.territorySignals / totals.comments) * 100,
                )}{" "}
                of comments; the rest are reactions with no subject matter.
              </li>
              <li>
                — Life stage is inferred from self-descriptive language, so
                cohorts are self-selected and small. Cells under five signals show
                a raw n instead of an index, because a ratio on four comments is
                noise.
              </li>
              <li>
                — Territory supply is read off titles, descriptions, and hashtags,
                not from watching the videos: a wellness moment inside a
                relationship episode counts as relationship supply.
              </li>
              <li>
                — Measured age and gender splits require YouTube Analytics API
                access held by the channel owner. With it, these inferred cohorts
                can be replaced by real ones.
              </li>
            </ul>
          </section>
        </div>
      )}
    </PageShell>
  )
}

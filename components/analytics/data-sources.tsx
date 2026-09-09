import { Database } from "lucide-react"
import {
  DATA_SOURCES,
  NOT_SOURCED,
  PLATFORM_COVERAGE,
} from "@/lib/sources"
import { formatDateTh, formatNumber } from "@/lib/utils"
import type { DataSnapshot } from "@/lib/queries/analytics"

/**
 * Where every number on the page came from.
 *
 * Dates and counts are passed in from the rows on screen rather than written
 * into the copy, so the attribution cannot drift out of step with the data
 * after the next ingest.
 */
export interface SourceCoverage {
  posts?: number
  comments?: number
  postsWithComments?: number
}

export function DataSources({
  snapshot,
  coverage,
  limits,
}: {
  snapshot: DataSnapshot
  coverage?: SourceCoverage
  /** Page-specific caveats, listed under the shared source table. */
  limits?: string[]
}) {
  return (
    <section className="space-y-4 rounded-xl border px-5 py-5">
      <div className="flex items-start gap-3">
        <Database className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            แหล่งที่มาข้อมูล
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            ข้อมูล ณ วันที่ {formatDateTh(snapshot.capturedAt)}
            {snapshot.firstPost && snapshot.lastPost && (
              <>
                {" · "}ครอบคลุมคอนเทนต์ที่เผยแพร่ระหว่าง{" "}
                {formatDateTh(snapshot.firstPost)} ถึง{" "}
                {formatDateTh(snapshot.lastPost)}
              </>
            )}
            {coverage?.posts !== undefined && (
              <>
                {" · "}
                {formatNumber(coverage.posts)} โพสต์
              </>
            )}
            {coverage?.comments !== undefined && (
              <>
                {" · "}
                {formatNumber(coverage.comments)} คอมเมนต์
                {coverage.postsWithComments !== undefined &&
                  ` จาก ${formatNumber(coverage.postsWithComments)} โพสต์`}
              </>
            )}
          </p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {DATA_SOURCES.map((source) => (
          <div key={source.name} className="space-y-1">
            <dt className="text-xs font-semibold">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted underline-offset-2"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </dt>
            <dd className="text-muted-foreground space-y-0.5 text-xs leading-relaxed">
              <p>{source.provides}</p>
              <p className="opacity-80">{source.detail}</p>
            </dd>
          </div>
        ))}
      </dl>

      <ul className="text-muted-foreground space-y-1.5 border-t pt-4 text-xs leading-relaxed">
        <li className="flex gap-1.5">
          <span aria-hidden="true">—</span>
          <span>{NOT_SOURCED}</span>
        </li>
        <li className="flex gap-1.5">
          <span aria-hidden="true">—</span>
          <span>{PLATFORM_COVERAGE}</span>
        </li>
        {limits?.map((limit) => (
          <li key={limit} className="flex gap-1.5">
            <span aria-hidden="true">—</span>
            <span>{limit}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

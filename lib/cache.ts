import { unstable_cache } from "next/cache"

/**
 * Read caching for the dashboard.
 *
 * Every number on this site comes out of a Supabase view over data that only
 * changes when an ingest script runs — never on a page view. Uncached, that
 * meant each visitor re-ran the same aggregate reads and, on a platform page,
 * re-downloaded every post row before a single pixel was sent.
 *
 * Reads are keyed by their arguments and tagged, so one `revalidateTag(INGEST_TAG)`
 * after an ingest drops the whole set at once rather than waiting out the TTL.
 */
export const INGEST_TAG = "ingest"

/** Seconds a cached read stays fresh. The TTL is the floor on how stale the
 * site can be if an ingest finishes without revalidating the tag. */
export const READ_TTL = 300

export function cachedRead<A extends unknown[], R>(
  key: string,
  read: (...args: A) => Promise<R>,
) {
  return unstable_cache(read, [key], {
    tags: [INGEST_TAG],
    revalidate: READ_TTL,
  })
}

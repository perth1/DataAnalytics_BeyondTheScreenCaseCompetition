/**
 * SQL literal helpers for the ingestion scripts.
 *
 * Ingestion emits .sql files rather than writing directly, so the only
 * credential the pipeline needs is a YouTube API key. The generated files are
 * applied through the Supabase SQL Editor or the MCP connection.
 */

export function lit(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null"
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (value instanceof Date) return quote(value.toISOString())
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'::text[]"
    return `array[${value.map((v) => quote(String(v))).join(",")}]::text[]`
  }
  if (typeof value === "object") return `${quote(JSON.stringify(value))}::jsonb`
  return quote(String(value))
}

export function quote(text: string): string {
  return `'${text.replace(/'/g, "''")}'`
}

/** Scalar subquery for a channel id, so generated SQL carries no uuids. */
export function channelRef(platform: string, handle: string) {
  return `(select id from channels where platform = ${quote(platform)}::platform and handle = ${quote(handle)})`
}

export function categoryRef(slug: string) {
  return `(select id from content_categories where slug = ${quote(slug)})`
}

export function postRef(platform: string, externalId: string) {
  return `(select id from posts where platform = ${quote(platform)}::platform and external_id = ${quote(externalId)})`
}

export interface InsertOptions {
  table: string
  columns: string[]
  /** Each value is already a SQL fragment. */
  rows: string[][]
  conflict: string
  /** Columns to overwrite on conflict. Empty means DO NOTHING. */
  update: string[]
}

export function buildInsert({
  table,
  columns,
  rows,
  conflict,
  update,
}: InsertOptions): string {
  if (rows.length === 0) return ""
  const values = rows.map((r) => `  (${r.join(", ")})`).join(",\n")
  const action =
    update.length === 0
      ? "do nothing"
      : `do update set ${update.map((c) => `${c} = excluded.${c}`).join(", ")}`
  return `insert into ${table} (${columns.join(", ")}) values\n${values}\non conflict (${conflict}) ${action};\n`
}

/** Splits rows into files small enough to paste or send in one statement. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

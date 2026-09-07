# Beyond The Screen

Data workspace for the **GoyNattyDream** case competition — a one-time historical
snapshot of cross-platform content performance, the source documents behind it,
and the strategy boards built on top.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn structure ·
Supabase (Postgres 17) · Recharts

No authentication and no runtime API keys. RLS grants public read on every table
and public write on `documents`, `plan_boards`, and `plan_cards` only — analytics
tables are read-only from the browser. `plan_cards`, `plan_boards`, and `documents`
are published to Supabase Realtime, so a few people can edit the same board at once
and each change lands in every open tab (`hooks/use-live-table.ts`).

## Menus

| Route | Purpose |
|---|---|
| `/analytics` | Cross-platform totals, category performance, per-platform dashboards. |
| `/analytics/[platform]` | `youtube` · `tiktok` · `instagram` · `facebook`. KPI row, avg views by month, format split, category breakdown, top content, comment insights. |
| `/documents` | Google Docs / Sheets and links, rendered live from source. |
| `/plan` | Five strategy framework boards with editable cards, synced live across everyone's tabs. |

## Setup

```bash
cp .env.local.example .env.local   # paste the Supabase anon key + a YouTube API key
npm install
npm run dev
```

`.env.local` holds two values. `YOUTUBE_API_KEY` is only read by the ingestion
script — the app itself never calls an external API.

The schema is already applied to project `tmuhsweajzqkamhpsemx` (ap-southeast-1).
To rebuild it elsewhere, run `supabase/migrations/0001_init.sql` then `0002_seed.sql`.

## What is and is not available

The channel belongs to someone else, so only YouTube's **public** Data API v3 is
in reach — an API key is enough, no OAuth and no channel ownership.

| Available | Not available |
|---|---|
| Every public video back to the first upload | Watch time, retention, average view duration |
| Title, description, tags, publish date, duration | Viewer age, gender, country |
| Views, likes, comment counts | Traffic sources, impressions, CTR |
| The comment text itself | Subscribers gained/lost per video |
| Channel subscriber and lifetime view counts | Revenue |

Audience insight therefore comes from **what viewers write** plus **how performance
varies by content type** — not from demographics.

TikTok, Instagram, and Facebook have no equivalent public API for another
account's organic posts, so those three load from creator-export CSVs.

## Ingestion — one pass, then done

Ingestion writes `.sql` files rather than talking to Supabase, so no service-role
key exists anywhere in the project. Apply the generated files in filename order,
either in the Supabase SQL Editor or through the MCP connection.

```bash
# YouTube — every public video from today back to the first upload,
# plus comments on the mass-reach ones
npm run ingest:youtube
npm run ingest:youtube -- --no-comments
npm run ingest:youtube -- --max 300 --comments-per-video 100
# -> data/raw/youtube-<date>/00-channel.sql, 01-posts-*.sql, 02-metrics-*.sql, 03-comments-*.sql

# TikTok / Instagram / Facebook — creator-export CSV
npm run ingest:csv -- --platform tiktok --file data/raw/tiktok.csv
# -> data/raw/tiktok-<date>/01-posts-*.sql, 02-metrics-*.sql
```

`data/` is gitignored.

The CSV importer maps common header names (`views`/`plays`/`impressions`,
`likes`/`reactions`, `comments`, `shares`, `saves`, …) case- and
space-insensitively, so raw exports usually import without editing.

### Content classification

`lib/classify.ts` assigns each post a category from Thai and English keywords
across 10 buckets (vlog, travel, food, beauty, review, challenge, talk, family,
sponsored, other). Sponsored wins over topical matches. Unmatched posts land in
`other` — override by updating `posts.category_id`.

### Mass-reach threshold

A post is flagged `is_viral` when it sits in the top view decile
(`VIRAL_VIEW_PERCENTILE`) and has at least 30 comments
(`MIN_COMMENTS_FOR_SUMMARY`), both in `lib/constants.ts`. Only flagged posts
enter the comment-analysis queue.

## Comment analysis

Analysis is done by Claude reading the exported comments directly — there is no
LLM API call in the app.

```bash
npm run export:comments
# -> data/analysis/<platform>/NN-<slug>.md  (one file per post, most-liked first)
# -> data/analysis/INDEX.md                 (the queue)
```

Claude reads those files and writes one JSON file per post into
`data/analysis/summaries/`:

```json
{
  "post_id": "uuid from the markdown header",
  "model": "claude-opus-5",
  "comment_count": 240,
  "summary": "Three to five sentences on what the audience is reacting to.",
  "themes": [{ "label": "Chemistry with guest", "share": 32, "example": "verbatim comment" }],
  "sentiment_breakdown": { "positive": 70, "neutral": 20, "negative": 5, "mixed": 5 },
  "audience_signals": ["..."],
  "content_requests": ["..."]
}
```

```bash
npm run build:summaries
# -> data/analysis/04-summaries.sql
```

Apply that file and the analysis appears under Comment insights on the platform
page.

## Documents

Register any Google Docs / Sheets / Slides URL on `/documents`. The file id is
parsed from the URL and content is read from Google on every page load:

- **Sheets** render as a native table via the CSV export endpoint, refreshed every 60s
- **Docs** render as text via the plain-text export endpoint, refreshed every 60s
- **All kinds** also get the official Google embed below, which reflects live edits

Native rendering needs link sharing set to *anyone with the link*. Without it the
embed still works for anyone signed into an account with access.

## Structure

```
app/
  analytics/[platform]/     per-platform dashboard
  documents/[id]/           live Google Docs / Sheets viewer
  plan/[framework]/         strategy board
  api/google/{doc,sheet}/   Google export proxies
components/
  ui/                       shadcn primitives + tubelight-navbar
  analytics/ documents/ plan/ layout/
lib/
  supabase/                 browser and server clients (read-only)
  queries/                  data access per menu
  youtube.ts classify.ts google.ts aggregate.ts sql.ts
  constants.ts plan-frameworks.ts types.ts
supabase/migrations/        schema + seed
scripts/
  ingest/youtube.ts ingest/csv-import.ts
  export-comments.ts build-summaries.ts
```

## Charts

Monochrome by design. Every chart is single-series (magnitude), so identity never
depends on colour; multi-category views use a validated grayscale sequential ramp
(`--chart-1` … `--chart-5`) with direct labels and an accompanying table. Tokens
are defined for light and dark in `app/globals.css`.

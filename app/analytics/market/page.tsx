import { Info, Users } from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { PlatformNav } from "@/components/analytics/platform-nav"
import { StatRow, StatTile } from "@/components/analytics/stat-tile"
import { ChartFrame } from "@/components/analytics/chart-frame"
import { EmptyState } from "@/components/ui/empty-state"
import { HeatTable } from "@/components/market/heat-table"
import { ResearchSources } from "@/components/market/research-sources"
import { ScaleBars } from "@/components/market/scale-bars"
import { ReachTable } from "@/components/market/reach-table"
import { CohortProfiles } from "@/components/market/cohort-profiles"
import { MarketLeaders } from "@/components/market/market-leaders"
import { FormatByCohort } from "@/components/market/format-by-cohort"
import {
  getCategoryScale,
  getChannelReach,
  getCohortCategories,
  getCohortFormats,
  getCohortQuotes,
  getCohortThemes,
  getCohortTotals,
  getCohortVideos,
  getMarketCoverage,
  getThemeScale,
} from "@/lib/queries/thai-market"
import {
  categoryScaleRows,
  cohortCategoryMatrix,
  cohortThemeMatrix,
  COHORTS,
  formatRows,
  MIN_CELL_SIGNALS,
  themeScaleRows,
} from "@/lib/thai-market"
import { figure, pivot, RESEARCH_SOURCES } from "@/lib/market-research"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"

// No per-request input, and the cohort views are the most expensive reads in
// the app, so the page is prerendered and refreshed in the background. Matches
// READ_TTL in lib/cache.ts, which a segment config cannot import.
export const revalidate = 300

/**
 * The Thai audience market — which content each age group watches.
 *
 * THE QUESTION, AND WHY THE PAGE IS BUILT IN TWO LAYERS
 * "What is each age group in Thailand interested in" cannot be answered from
 * one channel's own comments, which is what this page used to do: that sample
 * is the people we already reach, so it can only describe our audience, never
 * the market. It also cannot be answered by measurement alone, because YouTube
 * releases viewer age only through the Analytics API and only to the owner of
 * the channel being measured.
 *
 * So the page carries two independent bodies of evidence and never blends them:
 *
 *   1. PUBLISHED RESEARCH (data/market/thai-audience-research.json) — national
 *      surveys with real age brackets and real sample sizes. This is the layer
 *      that actually answers the question at population scale. Its weakness is
 *      that it is annual, coarse, and says nothing about specific content.
 *
 *   2. OUR OWN MEASUREMENT (migration 0011) — thousands of Thai channels pulled
 *      from YouTube's Thailand trending charts and Thai topic searches. Content
 *      is read from each video's own category, and age only from comments where
 *      the commenter states their own age, with the referent resolved so that
 *      "สามีอายุ 65" is not counted as the viewer. Precise and current, but the
 *      age evidence is rare — well under 1% of comments.
 *
 * They are kept apart because their age brackets differ (NBTC uses generations,
 * NSO uses 15-24/25-39/40-59, we use 13-19/20-24/25-39/40-54/55+) and merging
 * them would mean inventing a distribution inside each band.
 */
export default async function MarketAnalysisPage() {
  const [
    coverage,
    categoryScale,
    themeScale,
    cohortTotals,
    cohortCategories,
    cohortThemes,
    cohortFormats,
    channelReach,
    cohortVideos,
  ] = await Promise.all([
    getMarketCoverage(),
    getCategoryScale(),
    getThemeScale(),
    getCohortTotals(),
    getCohortCategories(),
    getCohortThemes(),
    getCohortFormats(),
    getChannelReach(12),
    getCohortVideos(3),
  ])

  const quoteLists = await Promise.all(
    COHORTS.map((c) => getCohortQuotes(c.band, 2)),
  )
  const quotes = Object.fromEntries(
    COHORTS.map((c, i) => [c.band, quoteLists[i]]),
  )

  const categories = categoryScaleRows(categoryScale)
  const themes = themeScaleRows(themeScale).filter((t) => t.key !== "none")
  const {
    rows: cohortRows,
    columns: cohortColumns,
    dropped: cohortDropped,
  } = cohortCategoryMatrix(cohortTotals, cohortCategories)
  const {
    rows: themeRows,
    columns: themeColumns,
    dropped: themeDropped,
  } = cohortThemeMatrix(cohortTotals, cohortThemes)
  const formats = formatRows(cohortFormats)

  const platforms = figure("daily-viewing")
  const ott = figure("ott-content")
  const social = figure("social-video-preference")
  const commerce = figure("genz-commerce")
  const reach = figure("youtube-reach")
  const usage = figure("internet-usage-rate")

  const corpusReady = (coverage?.videos ?? 0) > 0
  const cohortSignals = Number(coverage?.cohort_signals ?? 0)
  const comments = Number(coverage?.comments ?? 0)
  const latestReach = reach?.rows[reach.rows.length - 1]

  return (
    <PageShell
      title="ตลาดผู้ชมไทย"
      description="คนแต่ละช่วงวัยในประเทศไทยดูคอนเทนต์อะไร — จากงานวิจัยระดับประเทศ และจากการวัดคอนเทนต์ไทยหลายพันช่องบน YouTube"
      actions={<PlatformNav />}
    >
      <div className="space-y-10">
        {/* ---------------------------------------------- how to read this */}
        <div className="flex gap-3 rounded-xl border px-5 py-4">
          <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="space-y-1.5 text-xs leading-relaxed">
            <p className="text-sm font-semibold tracking-tight">
              หน้านี้อ่านอย่างไร
            </p>
            <p className="text-muted-foreground">
              หน้านี้ไม่อิงข้อมูลช่องเราเลย และแยกหลักฐานเป็นสองชั้นที่ไม่ผสมกัน
              ชั้นแรกคือ{" "}
              <span className="text-foreground font-medium">
                งานวิจัยที่เผยแพร่แล้ว
              </span>{" "}
              ซึ่งสำรวจประชากรจริงและมีช่วงวัยจริง เป็นชั้นที่ตอบคำถามได้ในระดับ
              ประเทศ ชั้นที่สองคือ{" "}
              <span className="text-foreground font-medium">
                การวัดของเราเองผ่าน YouTube API
              </span>{" "}
              ซึ่งอ่านหมวดคอนเทนต์จากข้อมูลที่เจ้าของคลิปตั้งไว้ และอ่านช่วงวัย
              จากคอมเมนต์ที่ผู้ชมบอกอายุตัวเองเท่านั้น
            </p>
            <p className="text-muted-foreground">
              ทั้งสองชั้นใช้{" "}
              <span className="text-foreground font-medium">
                ช่วงวัยไม่เหมือนกัน
              </span>{" "}
              — NBTC ใช้เจเนอเรชัน (Gen Z คือ 14–26 ปี) สำนักงานสถิติใช้
              15–24/25–39/40–59 ส่วนการวัดของเราใช้ 13–19/20–24/25–39/40–54/55+
              การเกลี่ยช่วงวัยให้ตรงกันต้องสมมติการกระจายตัวภายในช่วง
              ซึ่งจะกลายเป็นตัวเลขที่เราคิดขึ้นเอง จึงคงช่วงวัยของแต่ละแหล่งไว้
            </p>
          </div>
        </div>

        {/* ============================================================
            LAYER 1 — published research
           ============================================================ */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              ชั้นที่ 1 · งานวิจัยระดับประเทศ
            </h2>
            <p className="text-muted-foreground text-sm">
              ตัวเลขจากการสำรวจประชากรจริง คัดลอกตามต้นฉบับ
              พร้อมขนาดกลุ่มตัวอย่างของทุกค่า
            </p>
          </div>

          <StatRow>
            {latestReach && (
              <StatTile
                label={`YouTube เข้าถึงคนไทย (${latestReach.category})`}
                value={`${latestReach.value} ล้าน`}
                sub="ประมาณการจากเครื่องมือโฆษณา ไม่ใช่ผู้ใช้รายเดือน"
              />
            )}
            {usage && (
              <>
                <StatTile
                  label="อัตราใช้เน็ต อายุ 15–24"
                  value={formatPercent(
                    usage.rows.find((r) => r.age_group === "15-24")?.value ?? 0,
                  )}
                  sub="สำนักงานสถิติแห่งชาติ 2567"
                />
                <StatTile
                  label="อัตราใช้เน็ต อายุ 60+"
                  value={formatPercent(
                    usage.rows.find((r) => r.age_group === "60+")?.value ?? 0,
                  )}
                  sub="ช่วงวัยเดียวที่ยังเข้าไม่ถึงเน็ตจำนวนมาก"
                />
              </>
            )}
            {commerce?.rows.map((r) => (
              <StatTile
                key={r.category}
                label={
                  r.category.length > 42
                    ? `${r.category.slice(0, 42)}…`
                    : r.category
                }
                value={formatPercent(r.value)}
                sub="Gen Z ไทย · Think with Google"
              />
            ))}
          </StatRow>

          {platforms && (
            <ChartFrame
              title="แต่ละช่วงวัยเปิดแพลตฟอร์มไหนทุกวัน"
              caption={`${RESEARCH_SOURCES[platforms.source]?.publisher} ${
                RESEARCH_SOURCES[platforms.source]?.year
              } · ${RESEARCH_SOURCES[platforms.source]?.sample_size} · ตัวเลขคือสัดส่วนผู้ตอบที่ระบุว่ารับชมทุกวัน`}
            >
              <HeatTable
                rowHeader="แพลตฟอร์ม"
                columns={pivot(platforms).columns}
                rows={pivot(platforms).rows.map((r) => ({
                  label: r.label,
                  cells: r.cells.map((v) => ({ value: v })),
                }))}
                scale="share"
                format={(v) => formatPercent(v)}
              />
              <p className="text-muted-foreground mt-3 px-3 text-xs leading-relaxed">
                กลุ่ม Baby Boomer มีผู้ตอบเพียง 31 คน
                ค่าของช่วงวัยนี้จึงเป็นทิศทาง ไม่ใช่การวัดที่แม่นยำ
                และตัวเลขนี้วัดความถี่ในการเปิดใช้ ไม่ใช่จำนวนผู้ใช้ทั้งหมด
              </p>
            </ChartFrame>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {ott && (
              <ChartFrame
                title="คอนเทนต์ที่ดูมากที่สุดบน OTT"
                caption="ต้นฉบับเผยแพร่เฉพาะอันดับต้นของแต่ละเจเนอเรชัน ช่องว่างคือไม่มีข้อมูล"
              >
                <HeatTable
                  rowHeader="ประเภท"
                  columns={pivot(ott).columns}
                  rows={pivot(ott).rows.map((r) => ({
                    label: r.label,
                    cells: r.cells.map((v) => ({ value: v })),
                  }))}
                  scale="share"
                  format={(v) => formatPercent(v)}
                />
              </ChartFrame>
            )}
            {social && (
              <ChartFrame
                title="คอนเทนต์ที่ชอบบน social video"
                caption="จุดที่ช่วงวัยแยกกันชัดที่สุด — Gen Z ไปทางเพลง ช่วงวัยอื่นไปทางข่าว"
              >
                <HeatTable
                  rowHeader="ประเภท"
                  columns={pivot(social).columns}
                  rows={pivot(social).rows.map((r) => ({
                    label: r.label,
                    cells: r.cells.map((v) => ({ value: v })),
                  }))}
                  scale="share"
                  format={(v) => formatPercent(v)}
                />
              </ChartFrame>
            )}
          </div>

          <ChartFrame
            title="ขนาดของแต่ละช่วงวัยในประเทศไทย"
            caption="สำนักงานสถิติแห่งชาติ 2567 · ช่วงอายุตามที่ต้นฉบับใช้ ซึ่งไม่ตรงกับช่วงวัยของ NBTC"
          >
            <ReachTable />
            <p className="text-muted-foreground mt-3 px-3 text-xs leading-relaxed">
              ช่วง 40–59 ปีเป็นกลุ่มประชากรที่ใหญ่ที่สุดของประเทศ
              ขณะที่กลุ่ม 60+ เป็นช่วงวัยเดียวที่ยังมีคนจำนวนมากไม่ได้ใช้
              อินเทอร์เน็ต ซึ่งเป็นเหตุผลว่าทำไมการวัดจากคอมเมนต์ในชั้นที่ 2
              จะเก็บเสียงของกลุ่มนี้ได้น้อยกว่าสัดส่วนจริงเสมอ
            </p>
          </ChartFrame>

          <ResearchSources />
        </section>

        {/* ============================================================
            LAYER 2 — our own measurement
           ============================================================ */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">
              ชั้นที่ 2 · การวัดคอนเทนต์ไทยด้วย YouTube API
            </h2>
            <p className="text-muted-foreground text-sm">
              เก็บคลิปจากชาร์ตยอดนิยมของประเทศไทยและการค้นหาภาษาไทยหลายพันช่อง
              ไม่มีคลิปของช่องเราอยู่ในกลุ่มตัวอย่าง
            </p>
          </div>

          {!corpusReady ? (
            <EmptyState
              icon={Users}
              title="ยังไม่มีข้อมูลตลาด"
              description="รัน npm run ingest:market เพื่อเก็บคลิปจากชาร์ตยอดนิยมของไทยและการค้นหาภาษาไทย แล้วรัน npm run ingest:market -- --comments-only เพื่อเก็บคอมเมนต์"
            />
          ) : (
            <>
              <StatRow>
                <StatTile
                  label="คลิปที่เก็บ"
                  value={formatCompact(Number(coverage?.videos ?? 0))}
                />
                <StatTile
                  label="ช่องที่เกี่ยวข้อง"
                  value={formatCompact(Number(coverage?.channels ?? 0))}
                />
                <StatTile
                  label="ยอดวิวรวมในกลุ่มตัวอย่าง"
                  value={formatCompact(Number(coverage?.corpus_views ?? 0))}
                />
                <StatTile
                  label="คอมเมนต์ที่อ่าน"
                  value={formatCompact(comments)}
                />
                <StatTile
                  label="คอมเมนต์ที่บอกอายุตัวเอง"
                  value={formatNumber(cohortSignals)}
                  sub={
                    comments > 0
                      ? `${formatPercent((cohortSignals / comments) * 100)} ของคอมเมนต์`
                      : undefined
                  }
                />
                <StatTile
                  label="บอกอายุเป็นตัวเลข"
                  value={formatNumber(
                    Number(coverage?.stated_age_signals ?? 0),
                  )}
                  sub="หลักฐานชั้นที่แข็งที่สุด"
                />
              </StatRow>

              <div className="flex gap-3 rounded-xl border px-5 py-4">
                <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="space-y-1.5 text-xs leading-relaxed">
                  <p className="text-sm font-semibold tracking-tight">
                    ชั้นนี้วัดอย่างไร
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      หมวดคอนเทนต์
                    </span>{" "}
                    มาจาก categoryId ที่เจ้าของคลิปตั้งไว้เอง ไม่ได้เดาจากคำใน
                    ชื่อคลิป ส่วน{" "}
                    <span className="text-foreground font-medium">ช่วงวัย</span>{" "}
                    นับเฉพาะคอมเมนต์ที่ผู้ชมบอกอายุตัวเอง โดยตรวจว่าอายุที่พูดถึง
                    เป็นของคนที่คอมเมนต์จริง — “ผมอายุ 27” นับ แต่ “สามีอายุ 65”
                    ไม่นับ เพราะคำที่ใกล้ตัวเลขที่สุดคือคนอื่น
                  </p>
                  <p className="text-muted-foreground">
                    วิธีนี้แม่นแต่ได้สัญญาณน้อยมาก คือ{" "}
                    {comments > 0
                      ? formatPercent((cohortSignals / comments) * 100)
                      : "—"}{" "}
                    ของคอมเมนต์ทั้งหมด เพราะคนจะบอกอายุตัวเองเมื่ออายุนั้นสำคัญ
                    ต่อคำตอบที่เขาอยากได้ เช่นคลิปให้คำปรึกษาเรื่องเงินหรือสุขภาพ
                    ส่วนคลิปเพลงหรือคลิปตลกแทบไม่มีใครบอกอายุ ให้อ่านชั้นนี้เป็น
                    สัญญาณบอกทิศทางจากกลุ่มที่เลือกตัวเอง ไม่ใช่สัดส่วนประชากร
                  </p>
                </div>
              </div>

              <ChartFrame
                title="ตลาดไทยดูหมวดอะไร"
                caption="สัดส่วนยอดวิวของแต่ละหมวดในกลุ่มตัวอย่าง — ด้านนี้ไม่ใช้คอมเมนต์เลย จึงเป็นส่วนที่มั่นใจได้มากที่สุดของชั้นนี้"
              >
                <ScaleBars rows={categories} limit={12} />
              </ChartFrame>

              {themes.length > 0 && (
                <ChartFrame
                  title="แยกละเอียดตามหัวเรื่อง"
                  caption="อ่านจากชื่อคลิป คำอธิบาย และแท็ก เพราะ 15 หมวดของ YouTube แยกการเงินออกจากสุขภาพไม่ได้ — คลิปหนึ่งนับได้หัวเรื่องเดียว"
                >
                  <ScaleBars rows={themes} limit={10} />
                </ChartFrame>
              )}

              {themeRows.length > 0 && (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight">
                      แต่ละช่วงวัยสนใจหัวเรื่องอะไร
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      นี่คือคำตอบที่ตรงกับคำถามที่สุดในชั้นที่วัดเอง
                      และคมกว่าตารางหมวด YouTube ด้านล่าง เพราะหลายช่องตั้งหมวด
                      คลิปเป็น “บุคคลและบล็อก” กับทุกคลิปไม่ว่าเนื้อหาจะเป็น
                      เรื่องอะไร หัวเรื่องจึงอ่านจากชื่อคลิป คำอธิบาย และแท็ก
                      แทน ตัวเลขคือดัชนีเทียบค่าเฉลี่ยของคอมเมนต์ที่ระบุอายุ
                      ทั้งหมด — 1.0 คือเท่าค่าเฉลี่ย ช่องที่บางกว่า{" "}
                      {MIN_CELL_SIGNALS} รายการแสดงจำนวน n แทน
                    </p>
                  </div>
                  <div className="rounded-xl border px-3 py-4 sm:px-5">
                    <HeatTable
                      rowHeader="ช่วงวัย"
                      columns={themeColumns.map((c) => ({
                        key: c.key,
                        label: c.label,
                      }))}
                      rows={themeRows.map((r) => ({
                        label: r.meta.label,
                        sub: `${r.meta.ageRange} ปี · n=${formatNumber(r.signals)}`,
                        cells: r.cells.map((c) => ({
                          value: c.index,
                          n: c.signals,
                          thin: c.thin,
                        })),
                      }))}
                      scale="index"
                      format={(v) => `${v.toFixed(1)}×`}
                    />
                  </div>
                  {themeDropped > 0 && (
                    <p className="text-muted-foreground text-xs">
                      ซ่อนหัวเรื่องอีก {themeDropped} หัวเรื่องที่ยังไม่มีสัญญาณ
                      ถึง {MIN_CELL_SIGNALS} รายการในช่วงวัยใดเลย
                      การแสดงคอลัมน์เปล่าจะกลบหัวเรื่องที่มีข้อมูลจริง
                    </p>
                  )}
                </section>
              )}

              {cohortRows.length > 0 && (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight">
                      แต่ละช่วงวัยคอมเมนต์ในหมวดของ YouTube ไหนมากกว่าค่าเฉลี่ย
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      ตัวเลขในช่องคือดัชนี — สัดส่วนของช่วงวัยนั้นในหมวดหนึ่ง
                      หารด้วยสัดส่วนของช่วงวัยเดียวกันในคอมเมนต์ที่ระบุอายุทั้งหมด
                      ค่า 1.0 คือเท่าค่าเฉลี่ยพอดี ที่ต้องใช้ดัชนีเพราะทุกช่วงวัย
                      คอมเมนต์ในหมวดบันเทิงมากที่สุดเป็นปกติ ถ้าดูสัดส่วนดิบจะเห็น
                      แค่ข้อนั้นซ้ำ ๆ ช่องที่มีสัญญาณน้อยกว่า {MIN_CELL_SIGNALS}{" "}
                      รายการจะแสดงจำนวน n แทนดัชนี
                    </p>
                  </div>
                  <div className="rounded-xl border px-3 py-4 sm:px-5">
                    <HeatTable
                      rowHeader="ช่วงวัย"
                      columns={cohortColumns.map((c) => ({
                        key: c.key,
                        label: c.label,
                      }))}
                      rows={cohortRows.map((r) => ({
                        label: r.meta.label,
                        sub: `${r.meta.ageRange} ปี · n=${formatNumber(r.signals)}`,
                        cells: r.cells.map((c) => ({
                          value: c.index,
                          n: c.signals,
                          thin: c.thin,
                        })),
                      }))}
                      scale="index"
                      format={(v) => `${v.toFixed(1)}×`}
                    />
                  </div>
                  {cohortDropped > 0 && (
                    <p className="text-muted-foreground text-xs">
                      ซ่อนอีก {cohortDropped} หมวดที่สัญญาณยังไม่ถึง{" "}
                      {MIN_CELL_SIGNALS} รายการในช่วงวัยใดเลย
                    </p>
                  )}
                </section>
              )}

              {formats.length > 0 && (
                <ChartFrame
                  title="Shorts เทียบคลิปยาว แยกตามช่วงวัย"
                  caption="ความยาวคลิปเป็นข้อเท็จจริง ไม่ต้องตีความ — สิ่งเดียวที่อนุมานคืออายุของคนคอมเมนต์"
                >
                  <FormatByCohort rows={formats} />
                </ChartFrame>
              )}

              {cohortRows.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight">
                    โปรไฟล์แต่ละช่วงวัย พร้อมหลักฐานที่วัดได้
                  </h3>
                  <CohortProfiles
                    rows={themeRows.length > 0 ? themeRows : cohortRows}
                    videos={cohortVideos}
                    quotes={quotes}
                  />
                </section>
              )}

              <ChartFrame
                title="ช่องที่ถือการเข้าถึงในกลุ่มตัวอย่าง"
                caption="เรียงตามยอดวิวของคลิปที่เก็บได้ ไม่ใช่ขนาดช่องทั้งหมด และไม่มีช่องเราในตารางนี้"
              >
                <MarketLeaders rows={channelReach} />
              </ChartFrame>

              <section className="space-y-3 rounded-xl border px-5 py-5">
                <h3 className="text-sm font-semibold tracking-tight">
                  ข้อจำกัดของชั้นที่วัดเอง
                </h3>
                <ul className="text-muted-foreground space-y-2 text-xs leading-relaxed">
                  <li>
                    ชาร์ตยอดนิยมของ YouTube เป็นภาพของช่วงเวลาที่ดึงข้อมูล
                    ไม่ใช่ค่าเฉลี่ยของปี และเอนไปทางเพลงกับบันเทิงอย่างมาก
                    ส่วนคลิปที่ได้จากการค้นหาถูกเพิ่มเข้ามาเพื่อถ่วงให้หัวเรื่อง
                    อย่างการเงิน สุขภาพ การเรียน มีน้ำหนักพอที่จะอ่านได้
                  </li>
                  <li>
                    คอมเมนต์ที่บอกอายุมี {formatNumber(cohortSignals)} รายการจาก{" "}
                    {formatNumber(comments)} รายการ ทุกช่องในตารางดัชนีจึงต้อง
                    อ่านคู่กับค่า n ของตัวเอง และช่องที่บางเกินไม่แสดงดัชนีเลย
                  </li>
                  <li>
                    คนที่ยอมบอกอายุตัวเองในคอมเมนต์เลือกตัวเองเข้ามา
                    มักเป็นคนที่กำลังขอคำแนะนำ กลุ่มนี้จึงไม่ใช่ตัวแทนของผู้ชม
                    ทั้งหมดในช่วงวัยเดียวกัน
                  </li>
                  <li>
                    หมวดของคลิปคือหมวดที่เจ้าของคลิปเลือก ซึ่งบางช่องตั้งเป็น
                    “บุคคลและบล็อก” กับทุกคลิปไม่ว่าเนื้อหาจะเป็นเรื่องอะไร
                    ชั้นหัวเรื่องมีไว้ชดเชยข้อนี้
                  </li>
                  <li>
                    ยอดวิวและยอดคอมเมนต์คือค่าที่อ่านได้ ณ เวลาที่ดึงข้อมูล
                    {coverage?.fetched_at &&
                      ` ล่าสุดคือ ${new Date(coverage.fetched_at).toLocaleDateString("th-TH")}`}
                    คลิปใหม่จะยังสะสมยอดต่อไปหลังจากนั้น
                  </li>
                </ul>
              </section>
            </>
          )}
        </section>
      </div>
    </PageShell>
  )
}

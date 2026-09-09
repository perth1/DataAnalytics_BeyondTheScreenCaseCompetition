import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FormatBucket } from "@/lib/aggregate"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"

/**
 * Shorts against long clips on the metrics where they diverge.
 *
 * Rows are metrics and columns are formats — the opposite of the other tables
 * here — because the question this answers is "how do the two products
 * compare", which is read across, not down.
 */
export function FormatCompare({ buckets }: { buckets: FormatBucket[] }) {
  const rows: { label: string; value: (b: FormatBucket) => string }[] = [
    { label: "โพสต์", value: (b) => formatNumber(b.totals.posts) },
    { label: "สัดส่วนจำนวนโพสต์", value: (b) => formatPercent(b.postShare, 1) },
    { label: "ยอดวิวรวม", value: (b) => formatNumber(b.totals.views) },
    { label: "สัดส่วนยอดวิว", value: (b) => formatPercent(b.viewShare, 1) },
    { label: "ยอดวิวเฉลี่ยต่อโพสต์", value: (b) => formatNumber(b.avgViews) },
    { label: "ไลก์เฉลี่ยต่อโพสต์", value: (b) => formatNumber(b.avgLikes) },
    { label: "คอมเมนต์เฉลี่ยต่อโพสต์", value: (b) => formatNumber(b.avgComments) },
    { label: "ไลก์รวม", value: (b) => formatCompact(b.totals.likes) },
    { label: "คอมเมนต์รวม", value: (b) => formatCompact(b.totals.comments) },
    {
      label: "อัตราการมีส่วนร่วม (Engagement rate)",
      value: (b) => formatPercent(b.totals.engagementRate),
    },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ตัวชี้วัด</TableHead>
          {buckets.map((b) => (
            <TableHead key={b.key} className="text-right">
              {b.label}
              {b.hint && (
                <span className="text-muted-foreground block text-[11px] font-normal">
                  {b.hint}
                </span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            {buckets.map((b) => (
              <TableCell key={b.key} className="text-right tabular-nums">
                {row.value(b)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"
import type { TerritoryRow } from "@/lib/market"

/**
 * A gap bar reads out from a centre line: right of centre the audience raises a
 * subject more than the channel publishes it. The sign is printed as text too,
 * so direction never depends on reading the bar.
 */
function GapBar({ gap, scale }: { gap: number; scale: number }) {
  const width = Math.min((Math.abs(gap) / scale) * 50, 50)
  // Anchored to the centre from whichever side it grows, so a 3px floor keeps a
  // near-zero gap visible as a stub without detaching it from the centre line.
  const side = gap >= 0 ? { left: "50%" } : { right: "50%" }

  return (
    <div className="flex items-center gap-2">
      <div className="relative hidden h-4 w-24 shrink-0 sm:block">
        <span className="bg-border absolute inset-y-0 left-1/2 w-px" />
        <span
          className="absolute inset-y-1 rounded-sm"
          style={{
            ...side,
            width: `${width}%`,
            minWidth: "3px",
            background: gap >= 0 ? "var(--chart-1)" : "var(--chart-4)",
          }}
        />
      </div>
      <span className="tabular-nums">
        {gap > 0 ? "+" : ""}
        {gap.toFixed(2)}
      </span>
    </div>
  )
}

export function TerritoryTable({ rows }: { rows: TerritoryRow[] }) {
  const scale = Math.max(...rows.map((r) => Math.abs(r.gap)), 1)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>กลุ่มความสนใจ</TableHead>
          <TableHead className="text-right">สัญญาณ</TableHead>
          <TableHead className="text-right">สัดส่วนอุปสงค์</TableHead>
          <TableHead className="text-right">โพสต์</TableHead>
          <TableHead className="text-right">สัดส่วนอุปทาน</TableHead>
          <TableHead className="text-right">ช่องว่าง (จุด)</TableHead>
          <TableHead className="text-right">ยอดวิว</TableHead>
          <TableHead className="text-right">วิวเฉลี่ย</TableHead>
          <TableHead className="text-right">ER เฉลี่ย</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slug}>
            <TableCell>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.label}</span>
                {row.broad && (
                  <Badge
                    variant="outline"
                    title="คำที่จับได้เป็นคำแสดงอารมณ์ ไม่ใช่หัวเรื่อง ช่องว่างของแถวนี้จึงไม่ใช่ช่องว่างทางการตลาด"
                  >
                    กลุ่มคำแสดงอารมณ์
                  </Badge>
                )}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {row.labelEn} · {row.note}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.signals)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(row.demandShare)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.postCount)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(row.supplyShare)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <GapBar gap={row.gap} scale={scale} />
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.totalViews)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(row.avgViews)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(row.avgEngagementRate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

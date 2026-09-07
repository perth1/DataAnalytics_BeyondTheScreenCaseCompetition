import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"

export interface PerformanceRow {
  key: string
  name: string
  post_count: number
  total_views: number
  total_likes: number
  total_comments: number
  avg_views: number
  avg_engagement_rate: number
}

export function PerformanceTable({
  rows,
  label,
}: {
  rows: PerformanceRow[]
  label: string
}) {
  const totalViews = rows.reduce((sum, r) => sum + Number(r.total_views), 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{label}</TableHead>
          <TableHead className="text-right">Posts</TableHead>
          <TableHead className="text-right">Views</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="text-right">Avg views</TableHead>
          <TableHead className="text-right">Likes</TableHead>
          <TableHead className="text-right">Comments</TableHead>
          <TableHead className="text-right">Avg ER</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.post_count)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.total_views)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(
                totalViews > 0 ? (Number(row.total_views) / totalViews) * 100 : 0,
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(row.avg_views)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(row.total_likes)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(row.total_comments)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(row.avg_engagement_rate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

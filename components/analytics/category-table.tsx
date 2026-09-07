import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils"
import type { CategoryPerformance } from "@/lib/types"

export function CategoryTable({ rows }: { rows: CategoryPerformance[] }) {
  const totalViews = rows.reduce((sum, r) => sum + Number(r.total_views), 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
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
          <TableRow key={row.category_slug}>
            <TableCell className="font-medium">{row.category_name}</TableCell>
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

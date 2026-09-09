import { ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCompact, formatDate, formatPercent } from "@/lib/utils"
import type { PostWithMetrics } from "@/lib/types"

export function TopContentTable({ posts }: { posts: PostWithMetrics[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>เนื้อหา</TableHead>
          <TableHead>ซีรีส์</TableHead>
          <TableHead className="text-right">ยอดวิว</TableHead>
          <TableHead className="text-right">ไลก์</TableHead>
          <TableHead className="text-right">คอมเมนต์</TableHead>
          <TableHead className="text-right">ER</TableHead>
          <TableHead className="text-right">วันที่เผยแพร่</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post, i) => (
          <TableRow key={post.id}>
            <TableCell className="text-muted-foreground tabular-nums">
              {i + 1}
            </TableCell>
            <TableCell className="max-w-[380px]">
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-1.5"
              >
                <span className="line-clamp-2 group-hover:underline">
                  {post.title ?? post.external_id}
                </span>
                <ExternalLink className="text-muted-foreground mt-0.5 size-3 shrink-0" />
              </a>
            </TableCell>
            <TableCell>
              <Badge variant="muted">{post.category_name ?? "ยังไม่จัดหมวดหมู่"}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(post.views)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(post.likes)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCompact(post.comments)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(post.engagement_rate)}
            </TableCell>
            <TableCell className="text-muted-foreground text-right whitespace-nowrap">
              {formatDate(post.published_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

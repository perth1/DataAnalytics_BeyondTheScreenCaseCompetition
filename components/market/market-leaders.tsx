import { formatCompact } from "@/lib/utils"
import { categoryLabel } from "@/lib/thai-market"
import type { MarketChannelReach } from "@/lib/types"

/**
 * Who holds reach in the Thai corpus. Deliberately not benchmarked against our
 * own channel: this table answers "who is big in this market", and adding a
 * single highlighted row would turn a market read back into a channel read,
 * which is the thing the previous version of this page got wrong.
 *
 * corpus_views is views on the sampled videos only, not the channel's lifetime
 * total, so it ranks presence in this sample rather than channel size. The
 * subscriber column is the channel-size number, and it is often hidden by the
 * owner, which is why the two disagree.
 */
export function MarketLeaders({ rows }: { rows: MarketChannelReach[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-xs">
            <th className="px-3 py-2 text-left font-medium">ช่อง</th>
            <th className="px-3 py-2 text-left font-medium">หมวดหลัก</th>
            <th className="px-3 py-2 text-right font-medium">ผู้ติดตาม</th>
            <th className="px-3 py-2 text-right font-medium">คลิปในกลุ่มตัวอย่าง</th>
            <th className="px-3 py-2 text-right font-medium">ยอดวิวในกลุ่มตัวอย่าง</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel_id} className="border-b last:border-0">
              <td className="px-3 py-2.5 text-xs font-medium">
                <a
                  href={`https://www.youtube.com/channel/${r.channel_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {r.channel_title ?? r.channel_id}
                </a>
                {r.country && r.country !== "TH" && (
                  <span className="text-muted-foreground ml-1.5">
                    ({r.country})
                  </span>
                )}
              </td>
              <td className="text-muted-foreground px-3 py-2.5 text-xs">
                {categoryLabel(r.main_category)}
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {r.subscribers && Number(r.subscribers) > 0
                  ? formatCompact(Number(r.subscribers))
                  : "ไม่เปิดเผย"}
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {r.videos_in_corpus}
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {formatCompact(Number(r.corpus_views))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

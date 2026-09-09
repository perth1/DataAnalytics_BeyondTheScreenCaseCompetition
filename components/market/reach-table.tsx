import { formatPercent } from "@/lib/utils"
import { reachRows } from "@/lib/market-research"

/**
 * Population and internet reach by NSO age band.
 *
 * This is the denominator the rest of the page lacks. It is also where the
 * market's real shape shows up: 40–59 is the largest band in Thailand by a wide
 * margin, and 60+ is the only band where a large share of people are still not
 * online at all — which is exactly the group a comment-based measurement will
 * always under-sample.
 */
export function ReachTable() {
  const rows = reachRows()
  const maxPop = Math.max(...rows.map((r) => r.population), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-xs">
            <th className="px-3 py-2 text-left font-medium">ช่วงอายุ</th>
            <th className="px-3 py-2 text-right font-medium">ประชากร</th>
            <th className="px-3 py-2 text-left font-medium">สัดส่วนประชากร</th>
            <th className="px-3 py-2 text-right font-medium">ผู้ใช้เน็ต</th>
            <th className="px-3 py-2 text-right font-medium">ใช้เน็ต</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ageGroup} className="border-b last:border-0">
              <td className="px-3 py-2.5 text-xs font-medium">
                {r.ageGroup} ปี
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {r.population.toFixed(2)} ล้าน
              </td>
              <td className="px-3 py-2.5">
                <div className="bg-muted h-2 w-full min-w-[80px] overflow-hidden rounded-sm">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${maxPop > 0 ? (r.population / maxPop) * 100 : 0}%`,
                      background: "var(--chart-1)",
                    }}
                  />
                </div>
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {r.internet.toFixed(2)} ล้าน
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                {formatPercent(r.internetShare)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

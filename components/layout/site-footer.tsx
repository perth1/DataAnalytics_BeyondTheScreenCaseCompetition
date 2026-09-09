import { DATA_SOURCES } from "@/lib/sources"
import { BRAND } from "@/lib/constants"

/**
 * Site-wide attribution.
 *
 * Names the sources on every page, including Plan and Documents where no
 * analytics query runs — so the provenance travels with the site rather than
 * living only on the page that happens to load the data. Dates and record
 * counts belong to the detailed block on the analytics pages (DataSources),
 * which reads them off the rows it is already showing; keeping them out of here
 * avoids a database round-trip in the root layout.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t">
      <div className="text-muted-foreground mx-auto w-full max-w-7xl space-y-2 px-6 py-8 text-xs leading-relaxed">
        <p>
          <span className="text-foreground font-medium">แหล่งที่มาข้อมูล:</span>{" "}
          {DATA_SOURCES.map((s) => s.name).join(" · ")}
        </p>
        <p>
          ข้อมูลทั้งหมดมาจากปลายทางสาธารณะของแพลตฟอร์ม ไม่ได้ใช้สิทธิ์เจ้าของช่อง
          จึงไม่มีข้อมูลอายุหรือเพศที่วัดได้จริง — ตัวเลขช่วงวัยเป็นการอนุมานจาก
          ภาษาที่ผู้ชมเขียนถึงตัวเองในคอมเมนต์ ดูรายละเอียดวิธีคำนวณและข้อจำกัด
          ได้ที่ท้ายหน้าวิเคราะห์แต่ละหน้า
        </p>
        <p>
          {BRAND.name} · จัดทำเพื่อการศึกษาและการวิเคราะห์เชิงกลยุทธ์
          ไม่ใช่เอกสารทางการของช่อง {BRAND.subject}
        </p>
      </div>
    </footer>
  )
}

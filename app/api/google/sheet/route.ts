import { NextResponse } from "next/server"
import Papa from "papaparse"
import { sheetCsvUrl } from "@/lib/google"

// Always hit Google directly so the table matches the live sheet.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  const gid = searchParams.get("gid")
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 })
  }

  const res = await fetch(sheetCsvUrl(fileId, gid), {
    cache: "no-store",
    redirect: "follow",
  })

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          "Could not read the sheet. Set link sharing to anyone with the link.",
        status: res.status,
      },
      { status: 502 },
    )
  }

  const text = await res.text()
  if (text.trimStart().startsWith("<!DOCTYPE html")) {
    return NextResponse.json(
      { error: "The sheet is not shared publicly." },
      { status: 403 },
    )
  }

  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rows = parsed.data
  return NextResponse.json({
    headers: rows[0] ?? [],
    rows: rows.slice(1),
    fetchedAt: new Date().toISOString(),
  })
}

import { NextResponse } from "next/server"
import { docTextUrl } from "@/lib/google"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 })
  }

  const res = await fetch(docTextUrl(fileId), {
    cache: "no-store",
    redirect: "follow",
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: "Could not read the document.", status: res.status },
      { status: 502 },
    )
  }

  const text = await res.text()
  if (text.trimStart().startsWith("<!DOCTYPE html")) {
    return NextResponse.json(
      { error: "The document is not shared publicly." },
      { status: 403 },
    )
  }

  return NextResponse.json({ text, fetchedAt: new Date().toISOString() })
}

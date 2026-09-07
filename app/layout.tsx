import type { Metadata } from "next"
import "./globals.css"
import { SiteHeader } from "@/components/layout/site-header"
import { BRAND } from "@/lib/constants"

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.subject} Analytics`,
  description: BRAND.tagline,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="pt-4 sm:pt-24">{children}</main>
      </body>
    </html>
  )
}

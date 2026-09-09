import type { Metadata } from "next"
import "./globals.css"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { BRAND } from "@/lib/constants"

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.subject} Analytics`,
  description: BRAND.tagline,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <SiteHeader />
        <main className="pt-4 sm:pt-24">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}

/** Loads .env.local for standalone scripts run outside the Next.js runtime. */
import { config } from "dotenv"
import { existsSync } from "node:fs"

let loaded = false

export function loadEnv() {
  if (loaded) return
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) config({ path: file, quiet: true })
  }
  loaded = true
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local before running this script.`,
    )
  }
  return value
}

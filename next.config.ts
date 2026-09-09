import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // The site has no landing page of its own; / is the analytics overview.
  // Answering that at the edge beats rendering a page whose only job is to
  // call redirect().
  redirects() {
    return [{ source: "/", destination: "/analytics", permanent: false }]
  },
  experimental: {
    // Hold a visited page's segments client-side for a spell. Moving between
    // the platform tabs and the format tabs is the main way this dashboard is
    // read, and the default of 0 refetched the whole segment on every hop —
    // including going back to one just left.
    staleTimes: { dynamic: 30, static: 300 },
  },
}

export default nextConfig

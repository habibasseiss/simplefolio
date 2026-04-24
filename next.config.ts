import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google S2 favicons
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons**" },
      // icon.horse
      { protocol: "https", hostname: "icon.horse" },
      // DuckDuckGo icons
      { protocol: "https", hostname: "icons.duckduckgo.com" },
    ],
  },
};

export default nextConfig;

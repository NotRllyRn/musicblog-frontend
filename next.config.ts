import type { NextConfig } from "next"

const wordpressUrl = process.env.WORDPRESS_BASE_URL
  ? URL.parse(process.env.WORDPRESS_BASE_URL)
  : null

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: wordpressUrl
      ? [
          {
            protocol: wordpressUrl.protocol.slice(0, -1) as "http" | "https",
            hostname: wordpressUrl.hostname,
            port: wordpressUrl.port,
            pathname: "/wp-content/uploads/**",
          },
        ]
      : [],
  },
  allowedDevOrigins: ["10.17.11.4", "test.callita.day", "blogtest.tanningcat.com"],
}

export default nextConfig

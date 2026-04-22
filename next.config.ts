import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Extend the client-side router cache for dynamic routes so navigating back
  // to a previously visited page is instant (default is 0s for dynamic routes).
  experimental: {
    staleTimes: {
      dynamic: 30,  // cache dynamic page RSC payloads for 30s on the client
      static: 300,  // keep static page RSC payloads for 5min (up from default)
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // cache optimized images for 30 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;

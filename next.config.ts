import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Tree-shake heavy packages — only the components actually imported are bundled.
  experimental: {
    optimizePackageImports: ["recharts"],
    staleTimes: {
      dynamic: 60,   // cache dynamic RSC payloads for 60s on the client
      static: 600,   // keep static RSC payloads for 10 min
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

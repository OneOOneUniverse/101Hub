import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Tree-shake heavy packages — only the components actually imported are bundled.
    optimizePackageImports: ["recharts", "lucide-react", "@clerk/nextjs"],
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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // cache optimized images for 30 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Reduce bundle size by excluding server-only packages from client bundle
  serverExternalPackages: ["sharp"],
  // Enable HTTP/2 push and long-lived static asset caching
  async headers() {
    return [
      {
        source: "/(.*)\\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || "https://firebrick-snail-772746.hostingersite.com").replace(/\/+$/, "");
    return [
      {
        source: "/php-api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

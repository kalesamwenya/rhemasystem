import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const configuredApiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim();
    const isLocalTestApi = configuredApiOrigin
      && /^https?:\/\/localruntest\.com(?:\/|$)/i.test(configuredApiOrigin);
    const apiOrigin = (configuredApiOrigin && !(process.env.NODE_ENV === "production" && isLocalTestApi)
      ? configuredApiOrigin
      : "https://firebrick-snail-772746.hostingersite.com").replace(/\/+$/, "");
    return [
      {
        source: "/php-api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

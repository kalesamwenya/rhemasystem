import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebrick-snail-772746.hostingersite.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localruntest.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

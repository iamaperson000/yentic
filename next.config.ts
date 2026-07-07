import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices (e.g. a phone) to load /_next/* dev resources in `next dev`.
  allowedDevOrigins: ['192.168.179.210'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
  },
};

export default nextConfig;

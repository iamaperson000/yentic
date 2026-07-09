import type { NextConfig } from "next";

// SharedArrayBuffer (required by the in-browser C/C++ compiler) needs
// cross-origin isolation. Scope it to IDE-family routes only — marketing,
// signup (Google OAuth), and collab pages must keep default headers.
const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

// Top-level pages that must NOT get isolation headers (the workspace route
// is a root-level dynamic segment, so it needs an exclusion list).
const nonWorkspaceTopLevel = [
  "features", "privacy", "projects", "roadmap", "signup", "terms",
  "users", "collab", "collab-demo", "setup-profile", "u", "api",
  "ide", "project", "favicon.ico",
].join("|");

const nextConfig: NextConfig = {
  // Allow LAN devices (e.g. a phone) to load /_next/* dev resources in `next dev`.
  allowedDevOrigins: ['192.168.31.193'],
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
  async headers() {
    return [
      { source: "/ide/:path*", headers: isolationHeaders },
      { source: "/ide", headers: isolationHeaders },
      { source: "/project/:path*", headers: isolationHeaders },
      // The SDK's worker script must itself carry COEP to join the
      // cross-origin-isolated context and receive the shared memory.
      { source: "/wasmer-sdk/:path*", headers: isolationHeaders },
      {
        source: `/:workspaceId((?!(?:${nonWorkspaceTopLevel})$).+)`,
        headers: isolationHeaders,
      },
    ];
  },
};

export default nextConfig;

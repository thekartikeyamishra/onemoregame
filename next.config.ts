import type { NextConfig } from "next";

/**
 * Security headers. The CSP locks down framing, plugins, base URLs and form targets.
 * script-src is intentionally not allow-listed: Google AdSense loads scripts from a large,
 * changing set of Google domains, and a host allow-list would silently break ad serving.
 */
const csp = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: { formats: ["image/avif", "image/webp"] },
  experimental: { optimizePackageImports: ["motion"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  async redirects() {
    return [
      // NOTE: www <-> apex is handled in Vercel → Settings → Domains, never here.
      // A host redirect in code that disagrees with Vercel's causes ERR_TOO_MANY_REDIRECTS.
      // The resume was retired; keep old links working.
      { source: "/resume", destination: "/about", permanent: true },
      { source: "/cv", destination: "/about", permanent: true },
      { source: "/portfolio", destination: "/about", permanent: true },
      { source: "/projects", destination: "/work-with-me", permanent: true },
      { source: "/hire", destination: "/work-with-me", permanent: true },
      { source: "/waitlist", destination: "/early-access", permanent: true },
      { source: "/blog/page/1", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;

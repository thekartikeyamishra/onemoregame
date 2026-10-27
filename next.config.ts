import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ---- Project guard -----------------------------------------------------------------------------
// Next.js automatically uses a root-level app/ or pages/ folder (instead of src/app) and any PostCSS/Tailwind
// config it finds. Files like these from another project silently replace ONE MORE, so refuse to start.
const FOREIGN = ["app", "pages", "src/pages", "postcss.config.js", "postcss.config.mjs", "postcss.config.cjs", "postcss.config.ts",
  "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs", "tailwind.config.ts"].filter((p) => existsSync(join(process.cwd(), p)));
if (FOREIGN.length) {
  throw new Error(
    `\n\n  This folder contains files from another project that override ONE MORE:\n    ${FOREIGN.join("\n    ")}\n\n` +
    "  Fix: stop the dev server (Ctrl+C), then run:  npm run verify:fix\n" +
    "  (moves them into _foreign_backup/ — nothing is deleted), then start again with:  npm run dev\n",
  );
}

const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
const isDev = process.env.NODE_ENV !== "production";
// Production defaults to https://onemoregame.me. Local production builds (e2e, Lighthouse) set NEXT_PUBLIC_SITE_URL=http://localhost:…
const httpsSite = !isDev && (process.env.NEXT_PUBLIC_SITE_URL || "https://onemoregame.me").startsWith("https://");
const adHosts = adsEnabled
  ? " https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com https://*.adtrafficquality.google https://*.googleadservices.com https://*.googletagservices.com"
  : "";

// 'unsafe-inline' for scripts is needed by Next.js inline bootstrap/JSON-LD without per-request nonces
// (nonces would force every page to render dynamically). All other directives are locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${adHosts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${adHosts}`,
  "font-src 'self' data:",
  `connect-src 'self'${adHosts}`,
  `frame-src 'self'${adHosts}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(httpsSite ? ["upgrade-insecure-requests"] : []),
].join("; ");

const security = [
  { key: "Content-Security-Policy", value: csp },
  ...(httpsSite ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Token-bearing pages: never cache, never leak the URL via Referer, never index.
const sensitive = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: false,
  serverExternalPackages: ["firebase-admin"],
  compress: true,
  // Host (www ↔ apex) and HTTPS redirects are handled by the hosting platform's domain settings, never here:
  // doing both creates redirect loops (ERR_TOO_MANY_REDIRECTS). Canonical tags point to https://onemoregame.me.

  async headers() {
    return [
      { source: "/:path*", headers: security },
      { source: "/verify", headers: sensitive },
      { source: "/invite", headers: sensitive },
      { source: "/unsubscribe", headers: sensitive },
      { source: "/play/sign-in/confirm", headers: sensitive },
      { source: "/play", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/play/sign-in", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/c/:id", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/b/:code", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;

# Performance

Local Lighthouse (mobile emulation, throttled), production build:

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 98 | 100 | 100 | 100 | 2.1 s | 90 ms | 0 |
| `/blog/how-much-does-it-cost-to-build-an-app` | 96 | 100 | 100 | 100 | 2.0 s | 200 ms | 0 |
| `/tools/app-cost-calculator` | 95 | 100 | 100 | 100 | 2.7 s | 140 ms | 0 |

Re-run after deploy at pagespeed.web.dev; numbers on Vercel's edge are usually better than local. AdSense, once live, will lower scores somewhat on pages that show ads; that's expected and is why ads are lazy and space-reserved.

## The speed checklist, item by item

| Item | How it's handled |
|---|---|
| Compress images | No raster images in the UI (SVG mascot/icons). OG images are generated at build. `next/image` with AVIF/WebP is configured for any you add. |
| Lazy loading | Ad units load near the viewport; Mitra's chat code loads on first interaction; markdown images get `loading="lazy"`. |
| Code splitting | Automatic per route; the chat dock is a separate dynamic chunk; `motion` uses `LazyMotion` + `domAnimation`. |
| Cache API responses | Referral counts `private, max-age=60`; feed/llms/ads.txt cached; AI answers cached 7 days in Redis. |
| CDN | Vercel's edge network serves all static pages and assets. |
| Minify JS/CSS | Production build (Turbopack/SWC + Lightning CSS). |
| Index the database | Firestore indexes single fields automatically; composite indexes in `firestore.indexes.json`. |
| Reduce re-renders | Mascot eye-tracking writes CSS variables directly (no React state per mouse move); shared store via `useSyncExternalStore`. |
| Debounce input handlers | Calculator URL sync debounced 300 ms; pointer handlers throttled with `requestAnimationFrame`. |
| Paginate large lists | Blog index paginates at 10 posts (`/blog/page/n`). |
| Remove unused dependencies | Nine small runtime dependencies, each used. Old template assets removed. |
| Defer non-critical scripts | Chat dock deferred to first interaction; ads lazy. The AdSense loader itself is loaded async (not deferred further, so reviewers see it). |
| Loading skeleton | Pages are static HTML, so there's nothing to wait for; ad slots reserve their space; Mitra shows a typing indicator. |
| Load balancer | Vercel serverless functions scale horizontally and are load-balanced by the platform. Nothing to run yourself. |
| Compress API payloads | Brotli/gzip applied by Vercel; payloads are small JSON. |
| Database connection pooling | Firestore is HTTP/gRPC-based; one Admin SDK client is reused per instance (`lib/server/firebase.ts`). No pool to manage. |
| Cache expensive computed results | Blog parsing is cached in memory and done at build; cost estimates are pure functions memoised in the client. |
| Fix N+1 queries | Each sign-up is a single transaction with a fixed number of reads; no per-item queries in loops. |
| Server-side caching | Static generation for every content page; `/early-access` revalidates every 10 minutes (ISR). |
| Fonts | Two self-hosted variable woff2 files with `font-display: swap` and preloading via `next/font`. |

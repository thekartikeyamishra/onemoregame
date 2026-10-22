# Lighthouse results (local, measured 2026-10-21)

Lighthouse (npm, latest) against `next start` production build on localhost, headless Chromium 1194, default throttling.
These are **lab** results on a local machine without a CDN, not field (CrUX) data. Re-run on the deployed staging URL.

| Page | Form factor | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| / | mobile | 99 | 100 | 100 | 100 | 2.0 s | 0 | 80 ms |
| / | desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| /how-to-play | mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 60 ms |
| /how-to-play | desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| /early-access | mobile | 99 | 100 | 100 | 100 | 2.0 s | 0 | 60 ms |
| /early-access | desktop | 100 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms |

Note: the first mobile run of /early-access returned a Lighthouse runtime error (score 0, no metrics); the table shows the re-run.

## Re-run after the playtest build (2026-10-21, mobile, same setup)

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT |
|---|---|---|---|---|---|---|
| / | 96 | 100 | 100 | 100 | 2.7 s | 50 ms |
| /play (signed out) | 97 | 100 | 100 | 63* | 2.6 s | 70 ms |

\* `/play` is intentionally `noindex`; Lighthouse's SEO category penalises that by design.

## Re-run after guides + performance pass (2026-10-22, mobile, local production build)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| / | 95 | 100 | 100 | 100 | 2.6 s | 0 | 150 ms |
| /guides/combo-math | 91 | 100 | 100 | 100 | 1.9 s | 0 | 360 ms |
| /play | 97 | 100 | 100 | 100 | 2.4 s | 0.001 | 50 ms |

The guide's TBT is mostly framework runtime and layout on this 2-core test machine under 4× CPU throttling; re-measure on the deployed site (PageSpeed Insights) for field data.

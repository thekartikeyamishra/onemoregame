# ONE MORE — launch website & early-access system

Public site and open browser playtest of ONE MORE, a browser-first arcade game by Kartikeya Mishra at SEEVE Tech.

**Stack:** Next.js 16 (App Router, TypeScript) on Vercel · Cloud Firestore (Admin SDK, deny-all rules) · Resend (transactional email). The Remotion launch film is a separate project (`one-more-film.zip`).

## What's included
- **Content for search & AdSense**: 8 original guides (`/guides`) built from engine constants and measured stats (`npm run stats`), changelog, editorial policy; Article/FAQ/VideoGame schema
- **Domain**: https://onemoregame.me (www → apex via hosting domain settings), support@onemoregame.me, AdSense verification (meta + /ads.txt)
- **Open play**: anyone plays today's Daily Arena and friend challenges with no sign-up; confirming an email signs you in and unlocks Quick Play, the leaderboard, streaks and named challenges. A guest's run can be saved (claimed) onto their profile/leaderboard on confirmation.
- **Viral loop**: spoiler-free share text (Wordle-style) with WhatsApp / X / native share; every share creates a challenge link with its own preview image (`/c/:id/opengraph-image`)
- **Streaks**: consecutive Daily days, one missed day forgiven
- **Daily twists**: one rule change per weekday (engine-level, deterministic, replay-verified)
- **Levels**: 30 deterministic arenas across 10 level types (Boss every 5th), pass marks calibrated by bot simulation (`npm run levels` regenerates `src/content/levels.json`; a test fails if it drifts from the engine), stars, server-side unlocks
- **Ghost racing**: challenges replay the challenger's verified inputs in lock-step with a live ahead/behind gap (inputs re-verified server-side before they are stored)
- **Community**: `/community` page, footer channels, and a results-screen prompt shown only after a high moment (never on a first run, once per visit, 7-day snooze). Channels are configured in `src/lib/socials.ts`
- **Playable game** (`/play`, invite-only): deterministic engine shared by browser and server (`src/game/engine.ts`), Quick Play, Daily Arena (shared seed, resets midnight IST) with leaderboard, synthesized SFX, touch/mouse/keyboard controls, pause, reduce-effects setting
- **Power-ups**: Shield, Slow-mo, Magnet, Double — spawned deterministically from the seed
- **Anti-cheat**: server replay of every run (edited scores rejected), single-use server-issued run IDs bound to the session, minimum real-time check, ranked-only wall-clock budget, duplicate-input detection across accounts, per-player and per-IP run limits, engine-version gate, operator review/ban (`npm run leaderboard:review`)
- **Friend challenges** (`/c/:id`): share a run; anyone can play that exact arena without an account, then gets an early-access CTA crediting the challenger's referral code
- **Playtest sessions**: invitation acceptance signs you in; other devices use one-time email sign-in links (no passwords); HttpOnly session cookie
- **Demand metrics**: first run, repeat play, multi-day return, guest challenge runs, "would you come back tomorrow?" feedback (`npm run metrics`)
- 11 public, indexable pages: `/`, `/how-to-play`, `/campus-clash`, `/early-access`, `/fair-play`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`
- Canvas concept preview (pausable, reduced-motion aware, deterministic seed)
- Early access: validated request → hashed-ID record → email confirmation (48 h, single active link) → opaque referral link → batch invitations (single-use, 14 days) → one-click unsubscribe
- Campus Clash organizer-interest form
- Rate limiting (hashed IPs), honeypots, same-origin checks, generic responses (no account enumeration)
- TTL-based retention (unconfirmed requests 90 d, outbox 90 d, rate limits ~2 h)
- SEO: per-page metadata + canonicals, sitemap from a single route list, robots, JSON-LD, OG image, `llms.txt`
- Security headers + CSP; private token pages are `no-store`, `no-referrer`, `noindex`
- App-store badges in an honest "Coming soon" state until real URLs are configured (only `play.google.com` / `apps.apple.com` accepted)
- AdSense integration that renders nothing unless explicitly enabled with a valid publisher ID
- Operator scripts: issue invites, retry failed verification mail, privacy deletion, funnel metrics

## Quick start (Windows PowerShell)
```powershell
npm install
Copy-Item .env.example .env.local
# .env.example is set up for local development: in-memory data (no Firebase needed) and
# emails printed in the terminal with clickable links. Production settings live in Vercel environment variables (docs/DEPLOY-VERCEL.md).
npm run doctor         # checks Node, the install and your .env.local
npm run verify         # confirms the folder contains ONE MORE only (runs automatically before dev/build)
npm run verify:fix     # moves files from other projects into _foreign_backup/ (nothing is deleted)
npm run dev            # http://localhost:3000
```

## Quality gates
```powershell
npm run typecheck; npm run lint; npm test; npm run build
npx playwright install chromium   # once
npm run test:e2e                  # builds with build:local, then runs Playwright
```

## Docs
- `docs/DEPLOY-VERCEL.md` — **Vercel deployment (current)**: domains, env vars, Firestore service account
- `docs/LAUNCH-CHECKLIST.md` — owner actions, security/privacy, SEO/Search Console, AdSense, costs
- `docs/SEO-ADSENSE-PERFORMANCE.md` — AdSense approval plan, SEO and performance status, Search Console, backlinks
- `docs/ROADMAP.md` — game integration plan, growth plan, measurement
- `docs/lighthouse/RESULTS.md` — measured lab results

## Keeping the folder clean
Extracting a zip never deletes old files, so files from another project can linger and override ONE MORE (a root `app/` folder wins over `src/app/`).
`npm run dev` and `npm run build` refuse to run when that happens; `npm run verify:fix` moves the foreign files to `_foreign_backup/`.
After intentionally adding or removing files under `src/`, `public/`, `tests/` or `e2e/`, run `npm run manifest`.

## Android & iOS apps
`mobile/` holds the Capacitor 8 apps (Android targetSdk 36, iOS 15+). They load the live site and add haptics,
native sharing, the Android back button, a splash screen and an offline Practice mode. Build and store
submission steps, data-safety answers and review notes: [docs/MOBILE-STORES.md](docs/MOBILE-STORES.md).

## Chrome extension
`mobile/extension/` + `npm run build:ext` (in `mobile/`) builds a toolbar popup that plays offline Practice and sends
an optional daily reminder. Publishing steps: [docs/CHROME-EXTENSION.md](docs/CHROME-EXTENSION.md).

## Daily jobs
`/api/cron/push` (hourly, `.github/workflows/push.yml`) sends the opt-in daily reminder notifications. Generate VAPID
keys once with `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` in Vercel.
`/api/cron/winback` sends capped, opt-in win-back emails (3, 7 and 21 days after a player's last game). It is called
daily by `.github/workflows/daily.yml` with `CRON_SECRET` (set it in Vercel and in GitHub → Actions secrets).

## Business documents
[HOOKED-PLAYBOOK](docs/HOOKED-PLAYBOOK.md) (utility, ICP, market signal, Hook Model, 8-week proof plan) · [INVESTOR-FAQ](docs/INVESTOR-FAQ.md) (moats, aha moment, retention, unit economics) ·
[LEGAL-AND-OWNERSHIP](docs/LEGAL-AND-OWNERSHIP.md) · [RESILIENCE](docs/RESILIENCE.md) (failure points, fallbacks,
security, cost control) · [MONETIZATION](docs/MONETIZATION.md) · [SEO-ADSENSE-PERFORMANCE](docs/SEO-ADSENSE-PERFORMANCE.md).

## Shop (optional cosmetics)
`/shop` sells cosmetic skins, trails, Replay Studio and the Founder Pack. The apps use Google Play / App Store
billing through RevenueCat; the website uses Razorpay. Ownership is verified on the server and stored on the
player. Code: `src/lib/shop/`, `src/components/shop/`, `src/game/cosmetics.ts`. Setup, payouts and review rules:
[docs/MONETIZATION.md](docs/MONETIZATION.md).

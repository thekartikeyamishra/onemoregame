# Resilience, security and cost control

Every point of failure, what happens when it fails, and the fallback. The rule: **use providers, depend on none**.
Each one sits behind a small interface (`src/lib/store`, `src/lib/mailer.ts`, `src/lib/shop/service.ts`), so it can be
swapped without touching game code.

## Points of failure → fallbacks
| Dependency | If it fails | Fallback built in | Long-term exit |
|---|---|---|---|
| **Vercel** (hosting) | Site down | Apps show **Offline Practice** (real engine); Chrome extension and itch demo still play | Next.js runs on any Node host: Firebase App Hosting, Cloud Run, Netlify, a VPS (`npm run build && npm start`) |
| **Firestore** (data) | Leaderboards/Battle unavailable | Pages render with a "temporarily unavailable" notice; guests can still play unranked; health check reports 503 for alerts | Store interface (`src/lib/store/types.ts`); the memory store is already a second implementation (Postgres would be a third) |
| **Firestore quota** (Spark free plan) | Writes refused | Per-instance caches and run tickets keep ops low; Blaze plan with a **budget alert** removes hard caps | Docs: DATABASE-COSTS.md |
| **Resend** (email) | Emails not sent | Outbox records failures; sign-in links can be requested again; nothing else needs email | Mailer interface: switch to SES, Postmark or SMTP by changing one file |
| **Razorpay** (web payments) | Website checkout off | Shop shows "checkout opens soon"; app purchases continue through the stores | Payment provider is behind `createWebOrder`/webhooks: add Stripe, Cashfree or PayU alongside |
| **RevenueCat** (app purchases) | Purchase sync delayed | Purchases are cached on the device; Restore purchases; the webhook re-syncs from the RevenueCat API (idempotent) | Store receipts can be validated directly with Google/Apple APIs (same entitlement ids) |
| **Google Play / App Store** | App removed or delayed | The web app is the full game; PWA install from the browser | Alternate stores (Galaxy Store, Huawei AppGallery) use the same Capacitor build |
| **AdSense** | No ad revenue | Cosmetics revenue; page layout doesn't depend on ads | Any ad network or direct sponsorships fit the same slots |
| **GitHub Actions** (daily job) | Win-back emails pause for a day | The job is idempotent and capped; a missed day skips a stage instead of double-sending | Vercel Cron, Cloud Scheduler or any cron can call `/api/cron/winback` |
| **Player's connection** | Battle lag or drop | Jitter buffer for other players; moves are buffered and uploaded later; after 8 s the AI takes over the seat; rejoining keeps the seat | — |
| **A device or browser** | Old browser | Engine targets Safari 15 / Chrome 90; keyboard, mouse and touch all work | — |

## Security posture
- **Integrity:** scores are recomputed from inputs on the server (the client's score is never trusted). Run tickets
  are HMAC-signed and single-use. Duplicate input logs and impossible timings are rejected. Battle attacks are
  validated against energy, cooldowns and levels on the server.
- **Auth:** passwordless email links (single use, 60-minute expiry), HttpOnly SameSite session cookie, sessions
  revocable. Battle seats use random tokens stored only as HMACs.
- **Payments:** Razorpay signatures and webhooks verified with HMAC and constant-time compare; RevenueCat webhook
  authenticated; entitlements always re-read from the provider, never from the client.
- **Abuse limits:** per-IP rate limits on every write endpoint (hashed IPs only); body-size limits on every API;
  same-origin checks; Zod-style validation of all input.
- **Headers:** HSTS preload, CSP with an explicit host allow-list, `frame-ancestors 'none'`, nosniff, strict referrer
  policy, restrictive Permissions-Policy.
- **Data:** Firestore rules deny all client access (server-only Admin SDK). TTL deletes temporary data. No tracking cookies.
- **AI and bot traffic:** the MCP endpoint is read-only (game info, leaderboards, links) and cached; nothing an AI
  agent can call changes data. Heavy scraping hits CDN-cached pages, not the database. Add Vercel Firewall/BotID or
  Cloudflare in front if abuse ever appears; no code changes are needed.
- **Secrets:** only in Vercel environment variables; never in the repo or chat. Rotate `APP_SECRET`, the service
  account key and webhook secrets once a year, or immediately if exposed.

## Cost control (keep net profit high per user)
- No paid AI APIs in the loop (bots are deterministic code); replays and videos render on the player's device.
- Public data (leaderboards, pages) is served from the CDN; only personal data hits the database.
- Battle syncs are batched (1.5 s) with per-instance caches; lobby presence writes at most every 12 s.
- Email: transactional only, plus capped win-back (`WINBACK_DAILY_CAP`).
- Set **budget alerts** in Google Cloud (Billing → Budgets: ₹500 and ₹2,000) and Vercel (Spend management) so a
  traffic spike or attack can't create a surprise bill.

## Before launch: test in real conditions
| Check | How |
|---|---|
| Unit and integration tests (game, battle, shop, win-back, accounts) | `npm test` (all must pass) |
| Browser flows on desktop and phones (play, battle, shop, account) | `npm run test:e2e` |
| Two real phones on mobile data in one Battle room | Join from an invite link; check join toast < 2 s and smooth opponent movement |
| Throttled network | Chrome DevTools → Network → "Slow 4G": Battle should keep playing; "Connection unstable" notice appears and clears |
| Offline | Airplane mode in the app → Offline Practice |
| Load | Free: `npx autocannon -c 50 -d 30 https://onemoregame.me/api/game/leaderboard` (CDN-served) |
| Lighthouse | Chrome DevTools → Lighthouse (mobile) on /, /play, /battle, /shop; last results in `docs/lighthouse/RESULTS.md`; target ≥ 90 in every category |

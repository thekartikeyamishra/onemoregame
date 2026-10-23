# Launch checklist

## A. Owner-supplied information (required before public launch)
- [ ] Production domain → `NEXT_PUBLIC_SITE_URL`
- [ ] Operator legal name (person or registered entity) → `NEXT_PUBLIC_OPERATOR_NAME`
- [ ] Public contact email monitored for privacy requests → `NEXT_PUBLIC_CONTACT_EMAIL`
- [ ] Verified sending domain + `MAIL_FROM`, `RESEND_API_KEY`
- [ ] `APP_SECRET` (32+ chars) in Secret Manager, backed up securely
- [ ] Governing law/venue for `/terms` §10 once the entity is decided
- [ ] Real social profile URLs (optional), store listing URLs (only when live)
- [ ] Trademark check on "ONE MORE" before significant marketing spend

## A2. Community channels
- [ ] Replace the Discord invite in `src/lib/socials.ts` with a **non-expiring** invite and create a `#top-runs` channel (the site promises featured runs are by permission)
- [ ] Post each day's arena and its twist (e.g. "Turbo Tuesday") on X/Discord/Instagram so the streak loop has a daily trigger

## B. Legal review (not legal advice)
- [ ] Privacy notice, terms and cookie notice reviewed by a qualified professional for India (DPDP Act 2023 and Rules) and any target markets (e.g. GDPR if marketing to the EU)
- [ ] Confirm processor list matches reality (Google Cloud/Firebase, Resend) and update `/privacy` if you change providers
- [ ] Children: early access is 18+ or parent/guardian-submitted; school events need an institution-led consent process
- [ ] Before any prize/paid event: contest rules, eligibility, tax, consumer and gaming law review
- [ ] Remove the "Draft" banner component (`src/components/Legal.tsx`) only after review

## C. Security & privacy verification
- [x] Firestore rules deny all client access (rules tests in `tests-rules/`; run `npm run test:rules` where the emulator can be downloaded)
- [x] All writes via server code; tokens stored as SHA-256 hashes; emails keyed by HMAC; IPs only as HMAC for rate limits
- [x] Single-use, expiring invitations redeemed in a transaction (concurrency test passes)
- [x] Generic responses for duplicate/existing emails; honeypot returns success
- [x] Token pages: `no-store`, `Referrer-Policy: no-referrer`, `noindex`; tokens confirmed by POST (link scanners can't consume them)
- [x] CSP, `frame-ancestors 'none'`, nosniff, Permissions-Policy, HSTS (when HTTPS URL configured)
- [x] Logs contain error class/message only — no bodies, emails or tokens
- [x] `npm audit --omit=dev`: 0 vulnerabilities (dev-only tooling advisories exist in firebase-tools / client SDK used for rules tests)
- [x] Game scores verified server-side by deterministic replay; run IDs single-use; minimum real-time check; Daily runs unranked if over the wall-clock budget or if their input log duplicates another account's; leaderboard review/ban script
- [ ] Known limit: replay can't distinguish a skilled human from a bot that generates inputs in real time. Review top Daily scores (`npm run leaderboard:review`) and add organizer verification for prize events
- [x] Session cookie HttpOnly, SameSite=Lax, Secure on HTTPS; sessions revocable server-side (sign out deletes them)
- [x] Rate limits key on the client IP added by the trusted load balancer (`TRUSTED_PROXY_HOPS`), not spoofable X-Forwarded-For entries
- [ ] On staging: check Cloud Run logs that `TRUSTED_PROXY_HOPS=1` yields real client IPs (temporarily log `clientIp()` in a test deploy)
- [x] `/api/dev/issue-invites` returns 404 unless the in-memory backend AND `ALLOW_INSECURE_DEV_BACKENDS=true` (impossible in a Firestore deployment)
- [ ] On staging: confirm App Check isn't needed (no client SDK usage); consider Cloud Armor / reCAPTCHA if abuse appears
- [ ] Restrict who has Firestore/Secret Manager IAM access; enable audit logs
- [ ] Enable Firestore point-in-time recovery or scheduled exports for backup

## D. SEO & Search Console
1. Search Console → Add property (Domain property via DNS TXT is best). Or URL-prefix with HTML tag → `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
2. Submit `https://yourdomain/sitemap.xml`.
3. URL Inspection for `/`, `/how-to-play`, `/campus-clash`; request indexing; check "Google-selected canonical" matches.
4. Monitor Pages (indexing), Performance, Core Web Vitals, Manual actions, Security issues monthly.
5. Validate JSON-LD with the Rich Results Test / Schema Markup Validator.
6. Bing Webmaster Tools: import from Search Console.
- [x] Unique titles/descriptions, one H1, self-canonicals, sitemap = public routes only, robots disallows token routes (e2e-tested)
- Update `site.contentUpdated` in `src/lib/site.ts` when content changes materially.

## E. AdSense (only when ready — approval is Google's decision)
See **docs/SEO-ADSENSE-PERFORMANCE.md** for the full, current procedure (verification is already live via meta tag + ads.txt).

Prerequisites: substantial original content beyond the launch pages (e.g. organizer guide, dev updates with real progress, Daily Arena once live), real traffic from legitimate sources, contact/ownership details complete.
1. Apply at adsense.google.com with the production domain; add `ads.txt` to `public/` with the line AdSense provides.
2. After approval: set `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…`, `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=…`, `NEXT_PUBLIC_ADS_ENABLED=true`. CSP widens automatically.
3. Before enabling: add a Google-certified consent management platform (CMP) for EEA/UK visitors, update `/privacy` and `/cookies`.
4. The only slot is on `/how-to-play`, reserved height to avoid layout shift. Never place ads on forms, token pages, errors, or near game controls. Never click your own ads or buy bot traffic.
Revenue math: revenue = pageviews ÷ 1000 × page RPM. $5,500/month needs ≈ 1.1 M pageviews at $5 RPM or ≈ 275 K at $20 RPM — a business target, not a forecast.

## F. Production readiness
- [x] Typecheck, lint, 85 unit tests, 24 e2e tests (including full 60-second verified runs, guest play → claim → leaderboard), production build pass locally
- [x] Lighthouse lab results recorded (`docs/lighthouse/RESULTS.md`)
- [ ] Re-run e2e + Lighthouse on staging with Firestore + real email
- [ ] Set up a Google Cloud uptime check on `https://onemoregame.me/api/health` (200 = app + Firestore OK) and Cloud Logging alerts on 5xx and `[waitlist]` / `[game-start]` errors
- [ ] Budget alert configured

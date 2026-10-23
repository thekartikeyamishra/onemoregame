# Security, fraud prevention and AI cost controls

## Platform hardening

- **Headers:** HSTS (2 years, preload), `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `nosniff`, strict referrer policy, restrictive Permissions-Policy. `script-src` is not allow-listed because AdSense needs a changing set of Google domains.
- **Database:** Firestore rules deny all client access. Only server routes (Admin SDK) read or write.
- **Inputs:** every API validates with zod, caps lengths, and rejects cross-origin requests.
- **Privacy by design:** IPs stored only as salted SHA-256 hashes; confirmation and unsubscribe links are HMAC-signed; unsubscribe deletes the record; unconfirmed sign-ups auto-delete after 30 days (daily cron).
- **Secrets:** only in environment variables; nothing sensitive uses the `NEXT_PUBLIC_` prefix.

## Waitlist fraud and the penalty system

| Signal | Response |
|---|---|
| Honeypot filled or form submitted in < 2.5 s | Silently accepted, nothing stored (bots learn nothing) |
| Disposable email domain | Rejected with a clear message |
| Domain has no mail server | Rejected ("check for a typo") |
| Same mailbox via Gmail dots or `+tags` | Treated as the same person (canonical email) |
| > 6 attempts per network in 10 min | Rate limited |
| > 3 sign-ups from one network per day | Risk score 40; any referral voided (no penalty to the referrer) |
| Referrer and referee share a network, or same mailbox | **Self-referral**: referral voided, referrer's `voided` count +1 |
| Referrer reaches 3 voided referrals | **Flagged**: referral credit frozen, excluded from early waves pending review |
| Referral credit | Only when the referred person confirms their own email (with Resend enabled) |

The rules are disclosed in `/terms#early-access` and under the share link, which is both fair and a deterrent.

## Mitra: AI cost and abuse controls

Layered so the site makes money rather than loses it on AI:

1. **Free brain first.** About a dozen intents in 7 languages answer the common questions locally in the browser. These conversations cost nothing and never touch a server.
2. **Moat loop.** Unanswered questions are stored (text only, no identity) with a counter. Promote the top ones to intents monthly; every promotion permanently removes a class of AI calls.
3. **Answer cache.** Single-turn questions are normalised, hashed and cached for 7 days per language.
4. **Hard caps.** 8 requests/minute and 40/day per network; 12 AI calls per browser session; a site-wide `AI_DAILY_CAP` (default 300). At the cap, Mitra falls back to scripted answers. Your worst-case daily AI bill is therefore `AI_DAILY_CAP × (tokens per call × price)`, which with a small model and ~1,000 tokens per call is a small, fixed amount. Check your provider's current prices.
5. **Small context.** Last 6 turns, 600 characters each, 260 output tokens, prompt caching for the system prompt, cheapest capable model by default.
6. **Injection and abuse.** Obvious jailbreak phrasing is rejected before the model; the system prompt restricts scope and forbids invented prices, dates or promises; links to other domains are stripped from answers; model output never triggers actions. Sign-ups through the chat go through the same validated API with explicit consent.
7. **Revenue path.** Mitra's job is conversion: estimates → calculator, intent → early access or project form. Each AI answer is a cost attached to a visitor already in a conversion flow.

Set a monthly spending limit in your AI provider's console as the final backstop.

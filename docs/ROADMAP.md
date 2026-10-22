# Roadmap: game integration & growth

## Measurement (demand validation)
Funnel counts via `npm run metrics`: signups → verified → invited → accepted → first run → repeat play → returned on another day, plus verified referrals, guest challenge runs, challenges created, feedback yes/no and campus leads. Not yet measurable: campus pilot completed. Analytics events are defined in `src/lib/analytics.ts` and are a no-op until a provider and consent flow are chosen. Decide go/no-go per stage on behaviour (replays, D1 return), not waitlist size.

## Shipped in the playtest build
Quick Play, Daily Arena + leaderboard, four power-ups, friend challenges with guest play, replay-verified scores with ranking integrity checks, playtest sessions, feedback prompt, play metrics. Engine changes must bump `ENGINE_VERSION` (old clients are then rejected with a clear message) and keep the determinism rules at the top of `engine.ts`.

## Growth layer (shipped)
Open guest Daily play → share → challenge link → guest plays → email to save run → confirmed player. Metrics to watch: guest runs → claims (conversion), challenges created per run, challenge opens → runs, D1/D7 return and streak length. Social follows aren't rewarded (Instagram/YouTube/X rules); Discord is the primary community CTA.

## Next candidates (decide with playtest data)
- Squads / college leaderboards; 5-second highlight clips; ghost of your own personal best in Quick Play.

Shipped since: ghost racing in challenges, Daily twists (engine v3).
- If D1 return is weak: tune difficulty curve and combo window first (constants at the top of `engine.ts`), then add daily streaks.
- If challenge links convert: add a results image (OG image per challenge) to improve sharing previews.
- Campus Clash pilot: event = fixed seed + time window + roster; reuse runs/leaderboard with an `eventId`.
- Bot resistance for ranked events: input-timing heuristics and organizer verification for finals.

## Integration points
| Capability | Where it plugs in |
|---|---|
| Browser game launch | Done: `/play`, gated by `inviteState: "accepted"` sessions. Opening to the public = allowing sessions for verified signups or guests in `startRun`. |
| Accounts | Firebase Auth; link to `waitlistSignups` by HMAC of the verified email. |
| Daily Arena | Seed = HMAC(dailySecret, date). Server-validated replays (store inputs, re-simulate deterministically). Reuse `mulberry32` from `GamePreview.tsx` as the engine PRNG. |
| Friend challenges | `/c/[id]` public, noindex-by-default challenge pages (seed + score, no personal data); consider indexable aggregate pages only when they have real content. |
| Leaderboards | Firestore collection per seed with server-written entries only (rules stay deny-all for writes). |
| Campus events | `campusLeads` → `events` collection, organizer role via custom claims, spectator view. |
| Store listings | Set `NEXT_PUBLIC_GOOGLE_PLAY_URL` / `NEXT_PUBLIC_APP_STORE_URL`; badges switch to links automatically. |

## Launch sequence
1. Waitlist live; share in a few relevant communities; watch visitor→signup→verified.
2. Private playtest (20–50 invites): completed runs, voluntary replays, next-day return, qualitative feedback.
3. Referral test: count verified referral signups without any incentive.
4. Campus Clash pilot with one real organizer from `campusLeads`.
5. Content & monetization: publish only pages with real readers (organizer guide, dev updates with actual progress, Daily Arena strategy once live); evaluate AdSense afterwards.

## Organic growth rules
Earn links (college clubs, game-dev communities, honest dev logs, a press kit when there's news). No bought links, PBNs, mass comments, doorway pages or fabricated search volumes. Use Search Console queries to decide what to write next.

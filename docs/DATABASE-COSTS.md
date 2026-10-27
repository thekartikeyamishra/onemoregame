# Database: cost, performance and leaderboards

Firestore bills per document read/write (not per byte), so the design minimises **operations per player action**,
serves identical public data from caches, and deletes everything that isn't needed with TTL policies.

## Operations per action (measured in tests/leaderboards.test.ts and tests/battle.test.ts)
| Action | Reads | Writes | How |
|---|---|---|---|
| Start a run | 0 | 0 | Signed, self-contained **run ticket** (HMAC) instead of a `runStarts` document |
| Finish a run (verified, ranked) | ≤ 5 | ≤ 4 | One transaction: run (also makes the ticket single-use), player, daily best, weekly total |
| Public leaderboard (Today / This week) | ~0 | 0 | CDN cache 15 s + stale-while-revalidate 60 s, per-instance cache 10 s; 1 query + 1 count on a miss |
| Your rank, player ahead/behind | ~4 | 0 | Count aggregation (1 read per 1,000 entries) + 2 one-document queries + your row |
| Guest "this run would be #N" | ~2 | 0 | Count aggregation, CDN-cached per score 30 s |
| Battle sync (per player, every 1.5 s) | ≤ 1 + humans | 1 (defenders) | Per-instance room/lane caches shared by players on the same instance; small "head" lane documents |
| Rate limits on game paths | 0 | 0 | Per-instance limiter (runs are verified anyway); Firestore counters only on email/creation endpoints |

## Rough cost per player
A daily player doing 10 runs and checking their rank 10 times: ≈ 90 reads + 40 writes ≈ **$0.0001/day**
(≈ ₹0.25/month). Firestore's free tier (50k reads + 20k writes per day) covers roughly 400–500 such players daily.
AI players in Battle cost nothing; a 10-human Battle match costs a few US cents (see docs/BATTLE.md).

## Storage housekeeping (TTL)
`expireAt`/`expiresAt` fields with TTL policies (firestore.indexes.json → `fieldOverrides`): rate-limit windows,
sessions, login tokens, outbox, runs (120 days), daily scores and weekly totals (400 days), challenges (365 days),
battle rooms/lanes (6 hours). Deploy once: `npx firebase-tools deploy --only firestore --project onemoregameme`.
Large arrays (battle inputs, room rosters) are excluded from indexing to keep writes cheap and within limits.

## Leaderboards built for retention
- **Today**: best Daily Arena run; ties share a rank; 🔥 streak badges; live "resets in" countdown.
- **This week** (Mon–Sun IST): sum of your best Daily score per day — showing up every day beats one lucky run.
  Shows days played (n/7) and **last week's podium** ("next week's champion could be you").
- **Your position**: rank of N players, the exact points needed to pass the player above, who's chasing you.
- **After a run**: guests see where the run would place (a reason to confirm their email); signed-in players
  see their new rank and the gap to the next player.
- Integrity: only server-replayed, rank-eligible runs count; duplicate input recordings and slow-motion runs are
  excluded; players banned under Fair Play can't rank.

## Indexes (firestore.indexes.json)
dailyScores (day, score ↓/↑), weeklyScores (week, score ↓/↑), runs (seed, inputHash), plus the early-access ones.
Firestore needs these before the first leaderboard query, so deploy them before launch.

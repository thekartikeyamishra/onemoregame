# Battle mode — how it works and how to run it

## Format
- Two teams (Team Ember = A, Team Tide = B), 1–5 players each, humans or AI (easy/medium/hard), max 10 per room.
- Round 1: A defends, B attacks. Round 2: swap. Same length (3 or 5 min, host's choice).
- Winner: higher **average defending score per defender** (fair for 1v5). Tie → 90 s **Sudden Surge** (both teams
  defend; the arena attacks everyone every 15 s). Still tied → fewer knock-downs per defender; else a draw.
- Hit = knock-down (KO): combo lost, 1 s respawn at the centre, brief invulnerability. The clock never shortens.

## Kits (src/game/battle/config.ts)
Defenders spend energy (+1 per 1.5 s, max 10): Bulwark, Tractor, Stasis, Purge, Overdrive (LV2), Aegis Link (team,
after 0:45), Supernova (LV3). Levels by score: LV2 2,500 (also Second Wind), LV3 7,000.
Attackers: Strike (aimed mine), Swarm, Erosion, Mirror (LV2), Surge (LV2), Jam (LV2), Eclipse (LV3). Team-wide
versions cost ×1.75 and need LV2. Attacker levels: 25% of the round or 5 plays → LV2; 60% or 12 plays → LV3.
Attacker energy regen scales with defenders/attackers, so pressure per defender is equal in 1v5 and 5v1.
Every attack lands 3 s after the server accepts it and is shown to the defender (counter-play: dash, Purge, Bulwark).

## Architecture (low bandwidth, server-authoritative, no WebSockets needed on Vercel)
- Deterministic simulation (`src/game/battle/sim.ts`, built on `engine.ts`). Every client re-simulates every
  defender from their **inputs** (direction changes + ability presses); no positions are streamed.
- One request per player every ~1.5 s (`POST /api/battle/[code]` `action: "tick"`): uploads new inputs, receives only
  what changed since the client's cursors. Lobby polls every ~2.2 s.
- Attacks (`action: "attack"`) are stamped with the **server tick** and validated (energy, level, cooldown, target)
  by `acceptAttacks`, the same function every client uses.
- AI attackers follow a seeded schedule (no network). AI defenders and **takeovers** (a human silent for 8 s) use a
  deterministic pilot, so everyone computes the same result.
- When a round ends (+4 s grace) the first sync replays the whole round on the server (`simulateRound`) under a
  lock; that replay is the official result. Late-arriving effects on a client trigger a local rebuild.
- Storage: `battleRooms/{CODE}` (room, roster, results), `battleLanes/{CODE_match_round_player}` (recent inputs and
  plays), `battleLaneSegs/*` (archived input segments). Documents stay small; all expire via TTL (`expiresAt`, ~6 h).

## Deploy checklist
1. `npx firebase-tools deploy --only firestore --project <project-id>` (indexes, field exemptions and **TTL** for
   the three battle collections; firestore.indexes.json). TTL deletion can take up to 24 h after expiry.
2. Optional: `NEXT_PUBLIC_DISCORD_INVITE` = a non-expiring discord.gg link (Vercel env) → redeploy.
3. Smoke test: two devices, create a room at /battle, join from the invite link, add an AI, start.

## Cost guide (Firestore)
Per player per sync: 1 room read + ~1 read per human player (+1 write for defenders). A 2×3-minute 5v5 with 10 humans
≈ 50k reads / 3k writes (a few US cents). AI players cost nothing. The per-token throttle in the route blocks
runaway polling.

## Security / fair play
- Seat keys: 24 random bytes, kept in the browser, stored as HMAC only; sent in `x-battle-token`. Same-origin checks,
  rate limits on create/join, host-only lobby controls, gamer tags filtered.
- Inputs can't be from the future (+0.5 s max) or older than 10 s; a client that falls behind is replaced by the AI.
- What a modified client *can* do: ignore the Eclipse blackout visual (its Surge still applies), or be piloted by a
  script. Physics, scores and attacks can't be faked because the server replays everything.

## Tests
`tests/battle.test.ts` (sim determinism, client ↔ server equality through the real sync path, attack rules,
takeovers, round flow, tie-breaks) and `e2e/battle.spec.ts` (two browsers, full match with short test rounds via
`BATTLE_TEST_ROUND_SECONDS`, only honoured with `ALLOW_INSECURE_DEV_BACKENDS=true`).

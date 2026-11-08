# Utility, ICP, demand, monetization and the habit loop (Hooked)

An honest answer first: **demand for the category is proven; demand for ONE MORE is not proven yet.** The plan
below is built to prove or disprove it within 8 weeks at almost no cost, and to make the product a habit if it works.

## 1. Utility: what job does ONE MORE do?
"Give me a satisfying, fair, 60-second challenge in a dead moment (queue, break, between classes or meetings)
that I can win at, and that lets me show friends I'm better." Three jobs:
1. **A short mental reset** (internal trigger: boredom, a short break). Each run is exactly one minute.
2. **Proof of skill** (the self): a verified score, streaks and a personal best. Nothing is luck or bought.
3. **Bragging rights with friends** (the tribe): the same arena for everyone, ghost challenges, team Battle.

## 2. Market signal (October–November 2026)
| Signal | Evidence |
|---|---|
| Huge, mobile-first audience | India has ~600 M active gamers (+9% YoY) and ~8 B game downloads a year (Sensor Tower/AppsFlyer via PocketGamer.biz, Jul 2026) |
| Broadening demographics | Women are 49% of Indian players in 2026, up from 43% in 2023 (Niko Partners, Aug 2026) |
| Monetization is growing but thin per user | India mobile games revenue ~$1.5 B in 2026 for 600 M players, so cost per user must stay tiny (our design) |
| Daily-ritual formats retain | Wordle draws an estimated 12–15 M daily players years after launch; NYT Games uses daily cadence as its core retention mechanic |
| Shareable result loops drive discovery | Wordle/Connections-style shareable artifacts created the viral loop; our equivalents are ghost challenges, Battle links and replay videos |

**What isn't proven:** that people choose *a reflex arcade* daily the way they choose a word puzzle, and that Battle
gets groups to return weekly. The 8-week test in §8 answers this.

## 3. ICP (who to win first)
| Priority | Segment | Why them | Where to reach them for ₹0 |
|---|---|---|---|
| **1** | **College students in India, 18–24** (hostels, clubs, college Discords) | Dead time between classes, dense friend groups, competitive, share on WhatsApp/Instagram | Campus Clash nights, college fest stalls, club ambassadors, WhatsApp groups |
| 2 | Young office workers, 22–30 (desk break, Chrome) | Two-minute break habit, desktop browser | Chrome extension, LinkedIn/X build-in-public posts, Product Hunt |
| 3 | Casual web-game players worldwide | Already looking for browser games | itch.io, r/WebGames, CrazyGames/Poki submissions, SEO guides |

Everyone else can play (any phone, any browser, no account, offline practice), but first-year effort goes to segment 1,
because one campus brings 50–300 players in a single evening at zero CAC.

## 4. The Hook Model, mapped to what's built
| Hooked phase | Principle | In ONE MORE | Status |
|---|---|---|---|
| **External trigger** | Paid, earned, relationship and owned triggers | *Owned:* daily push reminder (opt-in, 1/day, skipped if played), Chrome extension reminder, win-back emails (3/7/21 days, then stop). *Relationship:* ghost challenge links, Battle invites, "X joined". *Earned:* replay videos and shared results | ✅ (push is new) |
| **Internal trigger** | Attach to an existing emotion or routine | Boredom or a short break → "one 60-second run". Daily ritual: "my arena before lunch". Competitive itch: "someone beat my score" | ✅ positioning + same-arena daily |
| **Action** | B = M·A·T (Fogg): make it easy | One tap from link to play; no sign-up, no download; 60 s; works offline; Quick match vs AI in ~6 s | ✅ |
| **Variable reward: tribe** | Social validation | Leaderboard rank, "would be #N today", Battle MVP badges, lead changes, Founder ★ | ✅ |
| **Variable reward: hunt** | Unpredictable resources | Every day's arena and twist differs; shard spawns and combos vary; AI opponents adapt | ✅ |
| **Variable reward: self** | Mastery and completion | Personal bests, 3-star levels, streaks, attacker/defender level-ups | ✅ |
| **Investment** | Stored value and loading the next trigger | Streak (with one forgiven miss), personal best, weekly total, levels unlocked, cosmetics, Founder badge, a friend's pending challenge. Each run *loads the next trigger*: the reminder, tomorrow's twist, the rematch | ✅ |
| **Ethics (Manipulation Matrix)** | Build only what you'd use and that improves users' lives | 60-second sessions (no endless feed), no loot boxes, no pay-to-win, at most one prompt per result, reminders capped and skipped once played, easy off-switches | ✅ by design |

## 5. Monetization: affordable for users, profitable per user
| Stream | Who pays | Price | Net to us | Notes |
|---|---|---|---|---|
| Website ads (AdSense) | Advertisers | Free for players | Grows with daily users (eCPM varies a lot by country) | Content pages only, never in the apps or mid-game |
| Founder Pack | Committed fans | ₹299 once | ≈ ₹215–247 | Limited to the first year; badge visible on leaderboards |
| Replay Studio | Proud players | ₹99 once | ≈ ₹70–83 | Offered at peak moments; doubles as free marketing |
| Skins, trails | Self-expressers | ₹49–79 | ≈ ₹35–66 | Cosmetic only |
| Later: brand-sponsored free campus cups | Brands | Free for players | Sponsorship fee | No paid entry or cash prizes (keeps it outside real-money gaming law) |

**Cost per user:** ≈ ₹0.25/month for a daily player; no AI API costs; push and email cost nothing at this scale.
So even a 1–2% payer rate makes each cohort profitable, and players who never pay still cost almost nothing.

## 6. CAC ≈ 0: the organic growth engine
1. **Play → share loops** (built): result card → ghost challenge link (friend plays *your exact run*) → they play →
   they share. Battle needs friends, so every room is an invite (link, WhatsApp, QR).
2. **Content loops:** Replay Studio videos branded with onemoregame.me; weekly podium posts; guides for SEO.
3. **Distribution with no install step:** web link, Chrome extension, itch.io, AI assistants (MCP), PWA.
4. **Campus Clash:** an ambassador runs an evening event; the room fills; the leaderboard becomes the bragging board.
Track **K-factor = invites accepted ÷ active players**. Above 0.3, growth compounds without ad spend.

## 7. Cold start (the empty-room problem)
- **Single-player value from the first second:** the Daily Arena is fun alone; AI fills every empty Battle seat.
- **Atomic network = one friend group or one campus.** Seed one network at a time (Campus Clash), not "everyone".
- **Seeded competition:** weekly podium, "N points to pass the next player"; illustrative scores never pose as real.
- **Hard-side first:** recruit 5–10 "organisers" (club leads, Discord admins) who bring groups. They're the scarce side.

## 8. The 8-week proof plan (kill or scale)
| Week | Action | Success signal |
|---|---|---|
| 1–2 | Launch to 3 communities (1 college, 1 Discord, r/WebGames) with the launch video | ≥ 500 first runs; ≥ 35% play a second run in the same visit |
| 3–4 | Campus Clash pilot; turn on push reminders | D1 ≥ 25%, D7 ≥ 12%; ≥ 20% of Daily players opt in to reminders |
| 5–6 | Replay Studio + challenge links pushed in-game | K-factor ≥ 0.2; ≥ 1 shared link per 10 runs |
| 7–8 | Shop live (web + Android) | ≥ 1% of weekly players buy something |
**If D7 < 8% after two iterations, the core loop isn't a habit:** change the game (shorter runs, new twists, team
leagues) before spending on growth. Never buy installs to hide a retention problem.

## 9. What the habit loop looks like for one player
Day 0: a friend's challenge link → plays in 2 s → loses by 140 → "One more" → beats it → sends it back (investment +
relationship trigger) → "Remind me" at 7 pm (owned trigger).
Day 1, 7 pm: "🔥 2-day streak on the line" → plays → a new twist and a different arena (hunt) → rank #41 today (tribe)
→ personal best (self) → streak 3 (investment).
Day 3: joins a Battle room from the college group → team win → rematch → Discord.
Day 10: the reminder is rarely needed: "arena before lunch" is now the internal trigger. That's the goal.

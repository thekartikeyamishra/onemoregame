# ONE MORE: strategy and investor FAQ

ONE MORE is a 60-second, skill-only arcade game: a free Daily Arena that everyone plays on the same seed, 30 levels,
and a live team **Battle** mode (attackers sabotage defenders in real time, then the roles swap). It runs in any
browser, as Android/iOS apps, as a Chrome extension, and inside AI assistants over MCP. Built and owned by
Kartikeya Mishra (SEEVE Tech), Bengaluru.

## The 30-second answer
- **Problem:** casual games are pay-to-win, ad-stuffed and solo. People want a quick, fair contest with friends.
- **Product:** one-minute runs, scores verified by replaying inputs on the server (cheating is close to impossible),
  and a multiplayer mode where both teams act at once. No app download needed: a link in WhatsApp is enough.
- **Business:** free to play; revenue from website ads and optional **cosmetic** purchases (Founder Pack,
  skins, Replay Studio videos). Infrastructure costs about ₹0.25 per daily player per month.
- **Distribution:** every result, challenge and replay is a shareable link or video, and Battle invites are a link.
  Growth is built into the product, not bought.

## Moats (why a well-funded team or an AI can't simply copy it)
Code can be copied. These three can't, because each is built out of time and people:

1. **The verified score history.** Every leaderboard score is a replayed input log on a deterministic engine. Over
   time this becomes a dataset of real human play, personal bests, streaks and rivalries. A copy starts with zero
   history: your streak, your rank and your friends' ghosts aren't on it.
2. **Rooms and rivalries (network effects).** Battle is played in groups: a college hall, a friend group, a Discord.
   Campus Clash events and weekly champions create local rivalries that return every week. One player switching to
   a clone is useless if their 9 friends are still here.
3. **A daily ritual.** Same seed for everyone, every day, plus streaks, weekly podiums and once-a-day reminders
   (extension, email). Habits form on the product people already open daily, not on the best clone.

Two **leverage features**:
- **Replay Studio:** every great run becomes a 30-second vertical video branded with onemoregame.me. Players
  distribute ads for us, for free, and pay ₹99 for the privilege.
- **Ghost challenges:** "beat my exact run" links that replay a friend's verified inputs next to you. They are the
  cheapest acquisition loop there is (zero CAC) and the hardest to fake.

## The aha moment (target: under 20 seconds)
| Second | What happens |
|---|---|
| 0 | Land on the site or open an invite link. One button: **Play** (no sign-up, no download) |
| 2–5 | Countdown with a one-line control hint ("Drag anywhere to steer"). The orb is never under your thumb |
| 5–15 | First shards, first combo, the ×-multiplier pops, haptics on phones |
| ~15 | First near-miss and dash: **the "I'm good at this" moment** |
| 60 | Score plus "this run would be #N today" and a one-tap **One more**. Battle: **Quick match vs AI** goes from tap to live play in about 6 seconds |

## Cold start (an empty game is a dead game)
- **AI fills every empty seat** in Battle (easy/medium/hard), so a match is never empty, even at 3 a.m. with one player.
- **The Daily Arena works solo** and is still competitive (the same arena for everyone, with ghost and leaderboard).
- **Seeded rivalry:** the weekly podium shows last week's winners; your rank always shows "N points to pass the next player".
- **Campus Clash:** one organiser brings 50–300 players into a single room in one evening. That gives density where it matters.
- **Zero-install channels** put the game where people already are: invite links, the Chrome extension popup,
  ChatGPT/Claude/Grok via MCP, itch.io, and the apps.

## Retention and engagement system
| Loop | Mechanism | Built |
|---|---|---|
| Daily | New seed and weekday twist; streaks with 🔥 badges; Chrome extension reminder (opt-out) | ✅ |
| Weekly | Weekly total leaderboard (showing up beats one lucky run), Monday reset, last week's podium | ✅ |
| Social | Ghost challenges, Battle rematch in the same room, Discord prompt after Battle | ✅ |
| Mastery | 30 levels with stars, attacker/defender level-ups in Battle, personal best moments | ✅ |
| Win-back | Opted-in emails at 3, 7 and 21 days of absence, then stop (no spam) | ✅ |
| Expression | Cosmetic skins and trails visible on leaderboards, Founder badge | ✅ |

Metrics to report monthly: D1/D7/D30 retention, runs per daily player, % of new players who share, Battle rooms
with ≥2 humans, K-factor (invites accepted ÷ players), paying users %, ARPPU.

## Unit economics (per player)
| Item | Value | Source |
|---|---|---|
| Server cost per daily active player | ≈ ₹0.25 / month | docs/DATABASE-COSTS.md (Firestore ops per action, CDN-cached boards) |
| Battle match with 10 humans | a few US cents | docs/BATTLE.md |
| AI players, replays and videos | ₹0 (run on the player's device) | Deterministic engine |
| Founder Pack net (app stores) | ≈ ₹215 of ₹299 | GST, then 15% store fee |
| Founder Pack net (website) | ≈ ₹247 of ₹299 | GST, then ~2% Razorpay |
| Customer acquisition | ~₹0 target | Share links, replays, Campus Clash, communities |

There are **no AI API costs**: the AI opponents are deterministic bots in our own engine, and the MCP integration
runs on the user's own assistant. So costs grow with database operations, which are cached.

## Risks and answers
| Risk | Mitigation |
|---|---|
| Copycats | The moats above; trademark filing; replay verification makes fake leaderboards obvious |
| Cheating | Server replay of every input; duplicate-input and slow-motion detection; Fair Play bans |
| Platform dependence (Vercel, Firebase, stores) | Every provider has a fallback (docs/RESILIENCE.md); the core game also runs offline |
| App store rejection | Built to the guidelines: native features, offline mode, deletion, IAP, UGC tools (docs/MOBILE-STORES.md) |
| Solo founder | Automated: server-verified scores, AI opponents, self-serve account deletion and refunds pages, a rulebook in every Battle, scheduled jobs. Support load is designed to be tiny |
| Ads revenue uncertainty | Ads are one stream; cosmetics and later sponsorship (campus events, brands) diversify it |
| Regulation of online games (India) | No money stakes, no cash prizes, no loot boxes: outside real-money gaming rules |

## Support from day one (one person)
- **Self-serve first:** FAQ, Battle rulebook (the ? button), How to Play, Fair Play, Refunds and Account pages
  answer the top questions. Every in-game screen says what to do next.
- **Fast human channel:** one email (support@onemoregame.me) with a 48-hour acknowledgement promise, and the Discord
  for community help. Pin the top 10 answers there.
- **Feedback in the product:** one-tap rating after Battle, reports in Battle, bug reports with device info.
- **Weekly ritual (30 minutes):** read feedback, reply, ship one fix, write the changelog. Visible care is support.

## What's next (12 months)
1. Launch Android → iOS → Chrome Web Store. Campus Clash pilots at 3 colleges.
2. Replay Studio and ghost challenges as the main viral loop. Weekly Battle cup on Discord.
3. Seasons with cosmetic rewards for skill, plus brand-sponsored free tournaments (no paid entry).
4. Raise only once retention is proven (D30 ≥ 10% and organic K-factor ≥ 0.3), so equity is spent on scaling what works.

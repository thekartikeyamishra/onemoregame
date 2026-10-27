/** Public development log. Add an entry for every user-visible release; keep entries factual. */
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-10-27",
    title: "Battle sound and in-game rulebook",
    items: [
      "Battle mode now has sound: pickups, dashes, knock-downs, every power, incoming-attack alarms, level-ups, countdowns, and victory/defeat jingles. One tap mutes it (shared with the Daily Arena setting).",
      "A ? button (or the H key) opens the Battle rulebook anywhere: rules, every defender and attacker power with its cost and level, and controls.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Weekly leaderboard and faster, leaner scoring",
    items: [
      "New This week leaderboard: your best Daily score each day, added up Monday to Sunday (India time). Showing up every day is how you win the week.",
      "See your exact rank, how many points you need to pass the player above you, and who is chasing you.",
      "Streak flames on the board, a reset countdown, and last week's podium.",
      "Guests see where a run would place before saving it.",
      "Runs start instantly and results load faster: fewer database round trips per run.",
    ],
  },
  {
    date: "2026-10-27",
    title: "Battle mode: multiplayer attackers vs defenders",
    items: [
      "New Battle mode for 1v1 up to 5v5: one team collects shards while the other sabotages, then roles swap. A tie goes to a 90-second Sudden Surge.",
      "Seven defender abilities (Bulwark, Tractor, Stasis, Purge, Overdrive, Aegis Link, Supernova) and seven attacker abilities (Strike, Swarm, Erosion, Mirror, Surge, Jam, Eclipse), with level-ups on both sides.",
      "Attackers can target one defender, tap an exact spot to drop a mine, or hit the whole team. Every attack is announced 3 seconds before it lands.",
      "AI players in easy, medium and hard fill empty seats, and take over for anyone whose connection drops.",
      "Join from any device with a gamer tag and an invite link. Only moves are sent over the network, and every result comes from the server's replay.",
      "Flex board after each battle: points, knock-downs taken and caused, best combo, and MVP badges.",
    ],
  },
  {
    date: "2026-10-24",
    title: "Levels: a 30-stage campaign",
    items: [
      "New Levels mode: 30 fixed arenas, ten level types (Sprint, Magnet Field, Precision, Frenzy, Gauntlet, Iron Start, Endurance, Swarm, Boss Arena and Warm-up).",
      "Each level has a pass mark set from simulated play; reach it to unlock the next. Two and three stars for higher scores.",
      "Every fifth level is a Boss Arena. Guests can try Level 1; confirming an email saves progress.",
      "Level scores are verified by replay with the level's exact rules, like every other run.",
    ],
  },
  {
    date: "2026-10-22",
    title: "Guides, ghost racing and Daily twists",
    items: [
      "Published eight guides written from the game's real rules and measured play, plus the methodology behind every number.",
      "Friend challenges now show the challenger's ghost racing alongside you, with a live ahead/behind gap.",
      "Daily twists: one rule change per weekday, from Magnet Monday to Swarm Saturday. Quick Play keeps the classic rules.",
      "Open playtest: anyone can play today's Daily Arena without signing up, and save the run by confirming an email.",
      "One-tap result sharing with spoiler-free share text and a preview image for every challenge link.",
      "Daily streaks, a public Daily leaderboard and a community page.",
    ],
  },
  {
    date: "2026-10-21",
    title: "Power-ups and stronger anti-cheat",
    items: [
      "Four power-ups: Shield, Slow-mo, Magnet and Double.",
      "Hazard collisions now match exactly what you see; the wall lets you slide along it; dash works from a standstill.",
      "Daily leaderboard integrity checks: slow-motion runs and copied input recordings stay off the leaderboard.",
    ],
  },
  {
    date: "2026-10-21",
    title: "First playable build",
    items: [
      "Quick Play and the Daily Arena with a leaderboard.",
      "Every saved score is verified on the server by replaying the run's recorded inputs.",
      "Friend challenge links and passwordless sign-in.",
    ],
  },
  {
    date: "2026-10-21",
    title: "Website launch",
    items: ["Public site with How to Play, Campus Clash, Fair Play and FAQ pages, and email sign-up."],
  },
];

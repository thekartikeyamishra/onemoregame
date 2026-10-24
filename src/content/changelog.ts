/** Public development log. Add an entry for every user-visible release; keep entries factual. */
export interface ChangelogEntry { date: string; title: string; items: string[] }

export const changelog: ChangelogEntry[] = [
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

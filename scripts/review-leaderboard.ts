/* Review a day's Daily Arena leaderboard and optionally remove a player from leaderboards.
 *   npm run leaderboard:review -- --day 2026-10-21
 *   npm run leaderboard:review -- --ban <signupId>
 * Runs are already replay-verified; look for implausible patterns (e.g. zero hits with very high input counts). */
import { banFromLeaderboard, dayKey, reviewDay } from "../src/lib/game-service";
import { arg, scriptCtx } from "./_ctx";

(async () => {
  const { store } = scriptCtx();
  const ban = arg("ban");
  if (ban) { console.log(`Removed ${await banFromLeaderboard(store, ban)} leaderboard entries; future runs unranked.`); return; }
  console.table(await reviewDay(store, arg("day") ?? dayKey()));
})();

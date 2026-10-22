import type { Guide } from "./types";
import { beginnersGuide } from "./beginners-guide";
import { comboMath } from "./combo-math";
import { dashGuide } from "./dash-and-near-misses";
import { powerUpsGuide } from "./power-ups";
import { dailyTwistsGuide } from "./daily-twists";
import { tournamentGuide } from "./college-tournament";
import { replayGuide } from "./replay-anti-cheat";
import { methodology } from "./methodology";

export type { Guide } from "./types";

export const guides: Guide[] = [beginnersGuide, comboMath, dashGuide, powerUpsGuide, dailyTwistsGuide, tournamentGuide, replayGuide, methodology];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

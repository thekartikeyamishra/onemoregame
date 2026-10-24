/* Regenerates src/content/levels.json from the level generator. Run after changing levels.ts or engine rules:
 *   npm run levels */
import { writeFileSync } from "node:fs";
import { LEVEL_COUNT, generateLevel } from "../src/game/levels";

const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => generateLevel(i + 1));
writeFileSync(new URL("../src/content/levels.json", import.meta.url), JSON.stringify(levels, null, 1) + "\n");
console.log(`levels.json: ${levels.length} levels, targets ${levels.map((l) => l.target).join(", ")}`);

/* Builds the itch.io playable demo (offline Practice with links to the full game): mobile/dist/one-more-itch.zip */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist/itch");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const html = readFileSync(join(root, "www/offline.html"), "utf8")
  .replace("<body>", '<body data-mode="itch">')
  .replace("<title>ONE MORE · Offline practice</title>", "<title>ONE MORE: 60-second arcade</title>");
writeFileSync(join(out, "index.html"), html);
copyFileSync(join(root, "www/offline.js"), join(out, "offline.js"));
execSync("zip -q -j ../one-more-itch.zip index.html offline.js", { cwd: out });
console.log("✓ dist/one-more-itch.zip (upload to itch.io as an HTML game)");

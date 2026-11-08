/* Builds the Chrome (and Edge/Brave) extension: offline Practice in the toolbar popup + an optional daily reminder.
   Output: mobile/dist/one-more-chrome-extension.zip (upload to the Chrome Web Store developer dashboard). */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist/extension");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const extra = `
  <div id="ext-bar" class="row" hidden>
    <button id="ext-daily" type="button">Today's Daily Arena ↗</button>
  </div>
  <label class="ext-remind"><input id="ext-remind" type="checkbox"> Remind me once a day when the new arena is live</label>`;
let html = readFileSync(join(root, "www/offline.html"), "utf8")
  .replace("<body>", '<body data-mode="ext">')
  .replace("<title>ONE MORE · Offline practice</title>", "<title>ONE MORE</title>")
  .replace('<button id="retry" type="button">Reconnect</button>\n  </div>', `<button id="retry" type="button">Reconnect</button>\n  </div>${extra}`)
  .replace("</style>", "  html, body { width: 400px; height: 580px; }\n  .ext-remind { display: flex; gap: 8px; align-items: center; justify-content: center; font-size: 13px; color: #a9b2cf; cursor: pointer; }\n  #ext-bar[hidden] { display: none; }\n</style>")
  .replace('<script src="offline.js"></script>', '<script src="offline.js"></script>\n<script src="popup-extra.js"></script>');
if (!html.includes('id="ext-remind"') || !html.includes("popup-extra.js") || !html.includes('data-mode="ext"')) throw new Error("offline.html changed: update build-extension.mjs");
// Battle link: the overlay's second button opens Battle in a new tab in "ext" mode (see src-offline/practice.ts).
writeFileSync(join(out, "popup.html"), html);
copyFileSync(join(root, "www/offline.js"), join(out, "offline.js"));
for (const f of ["manifest.json", "background.js", "popup-extra.js"]) copyFileSync(join(root, "extension", f), join(out, f));
cpSync(join(root, "extension/icons"), join(out, "icons"), { recursive: true });
rmSync(join(root, "dist/one-more-chrome-extension.zip"), { force: true });
execSync("zip -q -r ../one-more-chrome-extension.zip .", { cwd: out });
console.log("✓ dist/one-more-chrome-extension.zip (Chrome Web Store → Developer dashboard → Upload)");

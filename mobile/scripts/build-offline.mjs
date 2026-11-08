/* Bundles the offline Practice mode (the real game engine) into www/offline.js. */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [join(root, "src-offline/practice.ts")],
  outfile: join(root, "www/offline.js"),
  bundle: true, minify: true, format: "iife", target: ["safari15", "chrome90"], legalComments: "none",
});
console.log("✓ www/offline.js built");

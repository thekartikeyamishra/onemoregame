// Regenerates onemore-manifest.json (the list of files that belong to ONE MORE). Run after adding or removing files.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = process.cwd();
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else files.push(relative(ROOT, p).split("\\").join("/")); } };
for (const d of ["src", "public", "e2e", "tests"]) { try { walk(join(ROOT, d)); } catch { /* folder may not exist */ } }
writeFileSync(join(ROOT, "onemore-manifest.json"), JSON.stringify({ project: "one-more", files: files.sort() }, null, 2) + "\n");
console.log(`onemore-manifest.json: ${files.length} files`);

// Ensures this folder contains the ONE MORE project only (no files from other projects).
//   npm run verify        → report (also runs automatically before `dev` and `build`)
//   npm run verify:fix    → move foreign files into _foreign_backup/ (nothing is deleted)
// Plain Node, no dependencies.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const FIX = process.argv.includes("--fix");
const ROOT = process.cwd();
const BACKUP = "_foreign_backup";

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
if (pkg.name !== "one-more") {
  console.error(`✗ package.json is for "${pkg.name}", not ONE MORE. Extract the ONE MORE zip into this folder (it replaces package.json).`);
  process.exit(1);
}

// Files that break ONE MORE when present, because Next.js picks them up automatically.
const CONFLICTS = ["app", "pages", "src/pages", "postcss.config.js", "postcss.config.mjs", "postcss.config.cjs", "postcss.config.ts",
  "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs", "tailwind.config.ts", "middleware.ts", "src/middleware.ts"];

const manifest = existsSync(join(ROOT, "onemore-manifest.json"))
  ? new Set(JSON.parse(readFileSync(join(ROOT, "onemore-manifest.json"), "utf8")).files)
  : null;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(relative(ROOT, p).split("\\").join("/"));
  }
  return out;
}

const conflicts = CONFLICTS.filter((p) => existsSync(join(ROOT, p)));
// Files inside ONE MORE's source folders that ONE MORE doesn't ship (e.g. another project's components).
const extras = manifest ? ["src", "public", "e2e", "tests"].flatMap((d) => walk(join(ROOT, d))).filter((f) => !manifest.has(f)) : [];
const missing = manifest ? [...manifest].filter((f) => !existsSync(join(ROOT, f))) : [];

if (!conflicts.length && !extras.length && !missing.length) {
  console.log("✓ ONE MORE project verified (no foreign files).");
  process.exit(0);
}

if (conflicts.length) console.log(`✗ Files from another project that override ONE MORE:\n  ${conflicts.join("\n  ")}`);
if (extras.length) console.log(`! Files not part of ONE MORE (${extras.length}):\n  ${extras.slice(0, 30).join("\n  ")}${extras.length > 30 ? "\n  …" : ""}`);
if (missing.length) console.log(`! ONE MORE files missing (${missing.length}):\n  ${missing.slice(0, 15).join("\n  ")}${missing.length > 15 ? "\n  …" : ""}\n  → extract the latest ONE MORE zip into this folder again.`);

if (FIX) {
  for (const p of [...conflicts, ...extras]) {
    const from = join(ROOT, p), to = join(ROOT, BACKUP, p);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(to), { recursive: true });
    try { renameSync(from, to); } catch { cpSync(from, to, { recursive: true }); rmSync(from, { recursive: true, force: true }); }
  }
  // Remove now-empty folders left behind.
  for (const d of ["src", "public"]) pruneEmpty(join(ROOT, d));
  rmSync(join(ROOT, ".next"), { recursive: true, force: true });
  console.log(`\n✓ Moved ${conflicts.length + extras.length} item(s) to ${BACKUP}/ and cleared the .next cache. Run \`npm run dev\` again.`);
  process.exit(missing.length ? 1 : 0);
}

if (conflicts.length) {
  console.log("\n→ Run `npm run verify:fix` to move them into _foreign_backup/ (nothing is deleted), then try again.");
  process.exit(1);
}
process.exit(0); // extras/missing are warnings; only real conflicts stop the build

function pruneEmpty(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const n of readdirSync(dir)) pruneEmpty(join(dir, n));
  if (readdirSync(dir).length === 0 && dir !== join(ROOT, "src")) rmSync(dir, { recursive: true });
}

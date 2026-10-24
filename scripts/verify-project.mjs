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

// Everything ONE MORE has at the top level of the folder. Anything else there came from somewhere else
// (e.g. another project's app/, components/, lib/, postcss/tailwind configs) and can break dev/build.
const ROOT_ALLOWED = new Set([
  // ONE MORE files and folders
  ".github", ".gitignore", ".env.example", "AGENTS.md", "README.md", "docs", "e2e", "eslint.config.mjs", "film",
  "firebase.json", "firestore.indexes.json", "firestore.rules", "next.config.ts", "onemore-manifest.json", "package.json",
  "package-lock.json", "playwright.config.ts", "public", "scripts", "src", "tests", "tsconfig.json",
  "vitest.config.mts",
  // generated, local or tool files that are fine to have
  ".git", "node_modules", ".next", ".vercel", ".firebase", ".firebaserc", "next-env.d.ts", "tsconfig.tsbuildinfo", ".e2e",
  "test-results", "playwright-report", "coverage", ".vscode", ".idea", ".DS_Store", "Thumbs.db", "_foreign_backup",
  "firebase-debug.log", "firestore-debug.log", "npm-debug.log", ".npmrc", ".nvmrc", ".gitattributes", ".editorconfig", "LICENSE",
]);
const isEnvFile = (n) => n === ".env" || n.startsWith(".env.");
const ON_VERCEL = !!process.env.VERCEL;
// Vercel can place its own vercel.json in the build directory even when the repository has none.
if (ON_VERCEL && existsSync(join(ROOT, "vercel.json"))) {
  console.log(`ℹ vercel.json present in the Vercel build directory (ignored):\n${readFileSync(join(ROOT, "vercel.json"), "utf8").slice(0, 2000)}\n`);
}
const rootForeign = readdirSync(ROOT).filter((n) => !ROOT_ALLOWED.has(n) && !isEnvFile(n) && !(ON_VERCEL && n === "vercel.json"));
// Only entries Next.js actually picks up stop the build: a second app/pages router, middleware/proxy, or a
// PostCSS/Tailwind config (which would restyle or break compilation). Anything else is reported as a warning.
const BREAKING = /^(app|pages|middleware\.[cm]?[jt]s|proxy\.[cm]?[jt]s|instrumentation\.[cm]?[jt]s|postcss\.config\..+|tailwind\.config\..+)$/;
const CONFLICTS = [...rootForeign.filter((n) => BREAKING.test(n)), ...["src/pages", "src/middleware.ts", "src/proxy.ts"].filter((p) => existsSync(join(ROOT, p)))];
const strayRoot = rootForeign.filter((n) => !BREAKING.test(n));

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

const conflicts = CONFLICTS;
// Files inside ONE MORE's source folders that ONE MORE doesn't ship (e.g. another project's components).
const extras = manifest ? ["src", "public", "e2e", "tests"].flatMap((d) => walk(join(ROOT, d))).filter((f) => !manifest.has(f)) : [];
const missing = manifest ? [...manifest].filter((f) => !existsSync(join(ROOT, f))) : [];

if (strayRoot.length) console.log(`⚠ Not part of ONE MORE (ignored by the build; safe to delete or run \`npm run verify:fix\`):\n  ${strayRoot.join("\n  ")}\n`);
if (!conflicts.length && !extras.length && !missing.length && !(FIX && strayRoot.length)) {
  console.log("✓ ONE MORE project verified (no foreign files).");
  process.exit(0);
}

if (conflicts.length) console.log(`✗ Files/folders that are not part of ONE MORE (they can override it or break the build):\n  ${conflicts.join("\n  ")}`);
if (extras.length) console.log(`! Files not part of ONE MORE (${extras.length}):\n  ${extras.slice(0, 30).join("\n  ")}${extras.length > 30 ? "\n  …" : ""}`);
if (missing.length) console.log(`! ONE MORE files missing (${missing.length}):\n  ${missing.slice(0, 15).join("\n  ")}${missing.length > 15 ? "\n  …" : ""}\n  → extract the latest ONE MORE zip into this folder again.`);

if (FIX) {
  for (const p of [...conflicts, ...strayRoot, ...extras]) {
    const from = join(ROOT, p), to = join(ROOT, BACKUP, p);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(to), { recursive: true });
    try { renameSync(from, to); } catch { cpSync(from, to, { recursive: true }); rmSync(from, { recursive: true, force: true }); }
  }
  // Remove now-empty folders left behind.
  for (const d of ["src", "public"]) pruneEmpty(join(ROOT, d));
  rmSync(join(ROOT, ".next"), { recursive: true, force: true });
  console.log(`\n✓ Moved ${conflicts.length + strayRoot.length + extras.length} item(s) to ${BACKUP}/ and cleared the .next cache. Run \`npm run dev\` again.`);
  process.exit(missing.length ? 1 : 0);
}

if (conflicts.length) {
  console.log(ON_VERCEL || process.env.CI
    ? `\n→ These are in the commit being built. Remove them from the repository (git rm -r --cached <name>, commit, push) and deploy the new commit.`
    : "\n→ Run `npm run verify:fix` to move them into _foreign_backup/ (nothing is deleted), then try again.");
  process.exit(1);
}
process.exit(0); // extras/missing are warnings; only real conflicts stop the build

function pruneEmpty(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const n of readdirSync(dir)) pruneEmpty(join(dir, n));
  if (readdirSync(dir).length === 0 && dir !== join(ROOT, "src")) rmSync(dir, { recursive: true });
}

// Fails fast if files from another project are mixed into this one (runs before `dev` and `build`, also on Vercel).
// Why: Next.js uses a root `app/` folder instead of `src/app/` when both exist, and a stray postcss/tailwind config
// changes how every CSS file is compiled — either one silently replaces this site with something else.
import { existsSync, readdirSync } from "node:fs";

const allowed = new Set([
  // project files
  ".env.example", ".github", ".gitignore", "AGENTS.md", "CLAUDE.md", "README.md", "apphosting.yaml", "docs", "e2e",
  "eslint.config.mjs", "film", "firebase.json", "firestore.indexes.json", "firestore.rules", "next.config.ts",
  "package.json", "package-lock.json", "playwright.config.ts", "public", "scripts", "src", "tests", "tests-rules",
  "tsconfig.json", "vitest.config.mts", "vitest.rules.config.mts",
  // generated / local / tooling
  ".git", ".next", ".vercel", ".firebase", ".firebaserc", ".e2e", ".vscode", ".idea", "node_modules", "next-env.d.ts",
  "test-results", "playwright-report", "coverage", "tsconfig.tsbuildinfo", "firebase-debug.log", "firestore-debug.log", "npm-debug.log",
]);
const isEnv = (n) => n === ".env" || n.startsWith(".env.");

const foreign = readdirSync(".").filter((n) => !allowed.has(n) && !isEnv(n) && n !== ".DS_Store" && n !== "Thumbs.db");
const critical = ["app", "pages", "postcss.config.js", "postcss.config.mjs", "postcss.config.cjs", "tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"].filter((n) => existsSync(n));
const missing = ["src/app/layout.tsx", "src/app/page.tsx", "src/game/engine.ts"].filter((f) => !existsSync(f));

if (critical.length || missing.length) {
  console.error("\n✗ This folder doesn't contain a clean ONE MORE project.\n");
  if (critical.length) console.error(`  Files from another project override this site: ${critical.join(", ")}`);
  if (missing.length) console.error(`  Missing ONE MORE files: ${missing.join(", ")} — extract the latest one-more.zip here.`);
  if (foreign.length) console.error(`  All unexpected top-level items: ${foreign.join(", ")}`);
  console.error("\n  Remove them (PowerShell, in this folder):");
  console.error(`    Remove-Item -Recurse -Force ${foreign.map((f) => `'${f}'`).join(", ")}`);
  console.error("  then run the command again. Keep other projects in their own folder and repository.\n");
  process.exit(1);
}
if (foreign.length) console.warn(`⚠ Unexpected items in the project root (not used by ONE MORE): ${foreign.join(", ")}`);

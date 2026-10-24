// Local setup check: `npm run doctor`. Plain Node, no dependencies, so it works even when node_modules is broken.
import { existsSync, readFileSync } from "node:fs";

let problems = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => { problems++; console.log(`  ✗ ${m}\n      → ${fix}`); };

console.log("ONE MORE setup check\n");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 20 || (major === 20 && minor >= 9)) ok(`Node ${process.versions.node}`);
else bad(`Node ${process.versions.node} is too old`, "Install Node 20.9+ (22 LTS recommended).");

if (!existsSync("src/app/api/health/route.ts")) bad("This folder has an older version of the code", "Extract the latest zip so its files land directly in this folder (package.json should be replaced).");
const need = ["next/dist/lib/constants.js", "next/dist/bin/next", "react/package.json", "firebase-admin/package.json", "zod/package.json"];
const missing = need.filter((f) => !existsSync(`node_modules/${f}`));
if (missing.length === 0) ok("node_modules is complete");
else bad(`node_modules is incomplete (missing: ${missing.join(", ")})`,
      "PowerShell: Remove-Item -Recurse -Force node_modules, .next; npm cache verify; npm ci   (if it recurs: add a Windows Defender exclusion for this folder, or try `npx npm@10 ci`)");

// Same precedence as Next.js in development: .env.local overrides .env.
const env = {};
const files = [".env", ".env.development", ".env.local", ".env.development.local"].filter((f) => existsSync(f));
for (const f of files) {
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (files.length) ok(`Env files: ${files.join(", ")}`);
else console.log("  • No env files — dev defaults apply (in-memory data, emails in the terminal). That's fine.");
if (existsSync("one-more/package.json")) bad("A nested one-more/ folder exists (the zip was extracted inside the project)", "Copy the contents of one-more\\ up one level, then delete the nested folder.");
const backend = env.DATA_BACKEND || "memory";
if (backend === "firestore") {
  if (!env.GOOGLE_CLOUD_PROJECT && !env.FIRESTORE_EMULATOR_HOST && !env.FIREBASE_SERVICE_ACCOUNT_KEY) console.log("  • DATA_BACKEND=firestore without GOOGLE_CLOUD_PROJECT — dev will use the in-memory store. To use real Firestore locally: GOOGLE_CLOUD_PROJECT=onemoregameme + `gcloud auth application-default login`.");
  else ok(`Firestore backend (${env.FIRESTORE_EMULATOR_HOST ? "emulator" : env.GOOGLE_CLOUD_PROJECT})`);
} else ok("In-memory data store (local dev)");
const mail = env.MAIL_PROVIDER || "console";
if (mail === "resend" && (!env.RESEND_API_KEY || !env.MAIL_FROM)) console.log("  • MAIL_PROVIDER=resend without RESEND_API_KEY — dev will print emails to the terminal.");
else ok(mail === "console" ? "Emails print to the terminal (local dev)" : "Resend configured");
if (env.NEXT_PUBLIC_SITE_URL && !/^https?:\/\/localhost(:\d+)?$/.test(env.NEXT_PUBLIC_SITE_URL)) console.log(`  • NEXT_PUBLIC_SITE_URL=${env.NEXT_PUBLIC_SITE_URL} — links in local emails will point there, not to localhost.`);

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good. Run: npm run dev");
process.exit(problems ? 1 : 0);

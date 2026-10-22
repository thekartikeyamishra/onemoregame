/* Usage: npm run invites:issue -- --count 25 [--dry-run]
 * Requires MAIL_PROVIDER/RESEND_API_KEY/MAIL_FROM and NEXT_PUBLIC_SITE_URL so links point to production. */
import { issueInvites } from "../src/lib/early-access";
import { arg, scriptCtx } from "./_ctx";

const count = Number(arg("count") ?? 0);
if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error("--count must be 1..500");
issueInvites(scriptCtx(), { count, dryRun: process.argv.includes("--dry-run") }).then((r) => console.log(r));

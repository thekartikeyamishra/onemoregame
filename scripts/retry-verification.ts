/* Re-sends verification to pending signups whose last email failed. Usage: npm run outbox:retry [-- --limit 50] */
import { resendVerification } from "../src/lib/early-access";
import { C } from "../src/lib/store/types";
import { arg, scriptCtx } from "./_ctx";

(async () => {
  const ctx = scriptCtx();
  const failed = await ctx.store.query<{ signupId: string; kind: string }>(C.mailOutbox, {
    where: [["status", "failed"], ["kind", "verify"]],
    limit: Number(arg("limit") ?? 50),
  });
  let ok = 0;
  for (const f of new Set(failed.map((r) => r.data.signupId))) if (await resendVerification(ctx, f)) ok++;
  console.log({ failedRecords: failed.length, resentAccepted: ok });
})();

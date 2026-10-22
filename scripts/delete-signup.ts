/* Privacy erasure. Usage: npm run signup:delete -- --email person@example.com */
import { deleteSignupByEmail } from "../src/lib/early-access";
import { normalizeEmail } from "../src/lib/validation";
import { arg, scriptCtx } from "./_ctx";

const email = arg("email");
if (!email) throw new Error("--email is required");
deleteSignupByEmail(scriptCtx(), normalizeEmail(email)).then((found) =>
  console.log(found ? "Deleted signup, referral code, attribution and invitation." : "No signup found for that address. Check campusLeads manually."),
);

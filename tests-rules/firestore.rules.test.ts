/* Runs against the Firestore emulator: npm run test:rules (requires Java 11+). */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-one-more", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "waitlistSignups/abc"), { email: "x@example.com", status: "pending" });
  });
});
afterAll(async () => env?.cleanup());

describe("firestore rules", () => {
  const cols = ["waitlistSignups", "invitations", "referralCodes", "referralAttributions", "campusLeads", "mailOutbox", "rateLimits"];
  it("anonymous users cannot read or list private data", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "waitlistSignups/abc")));
    for (const c of cols) await assertFails(getDocs(collection(db, c)));
  });
  it("signed-in users cannot verify themselves, mint invitations or write anything", async () => {
    const db = env.authenticatedContext("user1", { email_verified: true }).firestore();
    await assertFails(updateDoc(doc(db, "waitlistSignups/abc"), { status: "verified" }));
    await assertFails(setDoc(doc(db, "invitations/x"), { signupId: "abc", usedAt: null }));
    await assertFails(setDoc(doc(db, "waitlistSignups/new"), { email: "y@example.com" }));
  });
});

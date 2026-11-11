import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { setMailerForTests, type MailMessage } from "@/lib/mailer";
import {
  RESEND_COOLDOWN_MS, VERIFY_TTL_MS, createCampusLead, deleteSignupByEmail, funnelMetrics, issueInvites,
  redeemInvite, requestAccess, signupIdFor, unsubscribe, unsubscribeToken, verifyEmail, type Signup,
} from "@/lib/early-access";
import { waitlistInputSchema } from "@/lib/validation";

const secret = "test-secret-test-secret-test-secret-123";
let store: MemoryStore;
let sent: MailMessage[];
const T0 = 1_800_000_000_000;

const input = (o: Record<string, unknown> = {}) => waitlistInputSchema.parse({ email: "Player@Example.com ", ageConfirmed: true, ...o });
const tokenFrom = (m: MailMessage, path: string) => new URL(m.text.match(new RegExp(`https?://\\S+${path}\\?token=\\S+`))![0]).searchParams.get("token")!;

beforeEach(() => {
  store = new MemoryStore();
  sent = [];
  setMailerForTests({ send: async (m) => (sent.push(m), { ok: true, providerId: "x" }) });
});

describe("requestAccess", () => {
  it("creates a pending signup keyed by a hash, never the raw email", async () => {
    const r = await requestAccess({ store, secret, now: T0 }, input());
    expect(r).toEqual({ outcome: "created", emailAccepted: true });
    const id = signupIdFor(secret, "player@example.com");
    expect(id).not.toContain("@");
    const s = await store.get<Signup>(C.signups, id);
    expect(s?.status).toBe("pending");
    expect(s?.email).toBe("player@example.com");
    expect(s?.purgeAt).toBeInstanceOf(Date);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("player@example.com");
  });

  it("does not resend within the cooldown and does not create duplicates", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    const r = await requestAccess({ store, secret, now: T0 + 1000 }, input());
    expect(r.outcome).toBe("cooldown");
    expect(sent).toHaveLength(1);
    expect(await store.count(C.signups, [])).toBe(1);
    const r2 = await requestAccess({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 1 }, input());
    expect(r2.outcome).toBe("resent");
    expect(sent).toHaveLength(2);
    expect(sent[0].idempotencyKey).not.toBe(sent[1].idempotencyKey);
  });

  it("reports provider failure honestly and records it in the outbox", async () => {
    setMailerForTests({ send: async () => ({ ok: false, error: "boom" }) });
    const r = await requestAccess({ store, secret, now: T0 }, input());
    expect(r.emailAccepted).toBe(false);
    const rows = await store.query(C.mailOutbox, {});
    expect(rows[0].data).toMatchObject({ status: "failed", error: "boom" });
    expect(JSON.stringify(rows[0].data)).not.toContain("token");
  });

  it("rejects invalid input and honeypot submissions", () => {
    expect(waitlistInputSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(waitlistInputSchema.safeParse({ email: "a@b.co", website: "spam" }).success).toBe(false);
    expect(waitlistInputSchema.safeParse({ email: "a@b.co", audience: "admin", ageConfirmed: true }).success).toBe(false);
    expect(waitlistInputSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(waitlistInputSchema.safeParse({ email: "a@b.co", ageConfirmed: true }).success).toBe(true);
  });
});

describe("verifyEmail", () => {
  it("verifies once, then reports already-verified for the same link", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    const token = tokenFrom(sent[0], "/verify");
    const r = await verifyEmail({ store, secret, now: T0 + 1000 }, token);
    expect(r.status).toBe("verified");
    const s = await store.get<Signup>(C.signups, signupIdFor(secret, "player@example.com"));
    expect(s?.purgeAt).toBeNull();
    const again = await verifyEmail({ store, secret, now: T0 + 2000 }, token);
    expect(again.status).toBe("already");
  });

  it("rejects tampered, malformed and expired tokens", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    const token = tokenFrom(sent[0], "/verify");
    expect((await verifyEmail({ store, secret }, token.slice(0, -2) + "zz")).status).toBe("invalid");
    expect((await verifyEmail({ store, secret }, "garbage")).status).toBe("invalid");
    expect((await verifyEmail({ store, secret, now: T0 + VERIFY_TTL_MS + 1 }, token)).status).toBe("expired");
  });

  it("invalidates the older link when a new one is sent", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    await requestAccess({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 1 }, input());
    expect((await verifyEmail({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 2 }, tokenFrom(sent[0], "/verify"))).status).toBe("invalid");
    expect((await verifyEmail({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 2 }, tokenFrom(sent[1], "/verify"))).status).toBe("verified");
  });
});

describe("referrals", () => {
  async function verifiedUser(email: string, ref?: string) {
    sent = [];
    await requestAccess({ store, secret, now: T0 }, input({ email, ref }));
    const r = await verifyEmail({ store, secret, now: T0 + 1 }, tokenFrom(sent[0], "/verify"));
    if (r.status !== "verified") throw new Error("not verified");
    return r.referralCode;
  }

  it("attributes a verified referral once, without exposing the referrer", async () => {
    const code = await verifiedUser("a@example.com");
    expect(code).toMatch(/^[a-z2-9]{10}$/);
    await verifiedUser("b@example.com", code);
    expect(await store.count(C.referralAttributions, [])).toBe(1);
    const a = await store.get<Signup>(C.signups, signupIdFor(secret, "a@example.com"));
    expect(a?.verifiedReferrals).toBe(1);
    // Re-requesting with the same email cannot inflate counts.
    await requestAccess({ store, secret, now: T0 + RESEND_COOLDOWN_MS * 2 }, input({ email: "b@example.com", ref: code }));
    expect(await store.count(C.referralAttributions, [])).toBe(1);
  });

  it("ignores unknown codes and does not count unverified signups", async () => {
    await requestAccess({ store, secret, now: T0 }, input({ email: "c@example.com", ref: "zzzzzzzzzz" }));
    expect(await store.count(C.referralAttributions, [])).toBe(0);
  });
});

describe("invitations", () => {
  async function setup() {
    await requestAccess({ store, secret, now: T0 }, input());
    await verifyEmail({ store, secret, now: T0 + 1 }, tokenFrom(sent[0], "/verify"));
    sent = [];
    const res = await issueInvites({ store, secret, now: T0 + 2 }, { count: 10 });
    return { res, token: tokenFrom(sent[0], "/invite") };
  }

  it("issues one invite per verified signup and never twice", async () => {
    const { res } = await setup();
    expect(res).toEqual({ selected: 1, issued: 1, emailed: 1 });
    const again = await issueInvites({ store, secret, now: T0 + 3 }, { count: 10 });
    expect(again.issued).toBe(0);
  });

  it("is single-use and expires", async () => {
    const { token } = await setup();
    expect(await redeemInvite({ store, secret, now: T0 + 10 }, token)).toBe("accepted");
    expect(await redeemInvite({ store, secret, now: T0 + 11 }, token)).toBe("already");
    expect(await redeemInvite({ store, secret }, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBe("invalid");
  });

  it("rejects expired invitations", async () => {
    const { token } = await setup();
    expect(await redeemInvite({ store, secret, now: T0 + 15 * 864e5 }, token)).toBe("expired");
  });

  it("handles concurrent redemption atomically", async () => {
    const { token } = await setup();
    const results = await Promise.all([1, 2, 3].map(() => redeemInvite({ store, secret, now: T0 + 10 }, token)));
    expect(results.filter((r) => r === "accepted")).toHaveLength(1);
  });
});

describe("unsubscribe, deletion, metrics, campus", () => {
  it("unsubscribes only with a valid signature", async () => {
    await requestAccess({ store, secret, now: T0 }, input({ updatesConsent: true }));
    const id = signupIdFor(secret, "player@example.com");
    expect(await unsubscribe({ store, secret }, `${id}.${"a".repeat(40)}`)).toBe(false);
    expect(await unsubscribe({ store, secret }, unsubscribeToken(secret, id))).toBe(true);
    expect((await store.get<Signup>(C.signups, id))?.updatesConsent).toBe(false);
  });

  it("deletes all of a person's records", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    await verifyEmail({ store, secret, now: T0 + 1 }, tokenFrom(sent[0], "/verify"));
    expect(await deleteSignupByEmail({ store, secret }, "player@example.com")).toBe(true);
    expect(await store.count(C.signups, [])).toBe(0);
    expect(await store.count(C.referralCodes, [])).toBe(0);
  });

  it("reports real funnel counts and lists metrics not yet measurable", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    const m = await funnelMetrics(store);
    expect(m).toMatchObject({ signups: 1, verified: 0 });
    expect(m.notYetMeasurable).toContain("campus_pilot_completed");
  });

  it("stores campus leads without the honeypot field", async () => {
    const id = await createCampusLead({ store, secret, now: T0 }, {
      name: "Asha", email: "asha@college.edu", institution: "Example College", role: "club-lead", size: "50-200", message: "", website: "",
    }, null);
    const lead = await store.get(C.campusLeads, id);
    expect(lead).not.toHaveProperty("website");
  });
});

describe("email dead ends (no silent no-ops)", () => {
  it("re-entering an already confirmed email sends a sign-in link instead of nothing", async () => {
    await requestAccess({ store, secret, now: T0 }, input());
    await verifyEmail({ store, secret, now: T0 + 1 }, tokenFrom(sent[0], "/verify"));
    sent = [];
    const r = await requestAccess({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 10 }, input());
    expect(r.outcome).toBe("signin");
    expect(r.emailAccepted).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("/play/sign-in/confirm");
  });

  it("signing in with a pending (unconfirmed) email resends the confirmation link", async () => {
    const { requestSignIn } = await import("@/lib/game-service");
    await requestAccess({ store, secret, now: T0 }, input());
    sent = [];
    expect(await requestSignIn({ store, secret, now: T0 + RESEND_COOLDOWN_MS + 10 }, "player@example.com")).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("/verify?token=");
  });

  it("reports a provider failure instead of pretending the email went out", async () => {
    setMailerForTests({ send: async () => ({ ok: false, error: "provider_status_403: domain not verified" }) });
    const r = await requestAccess({ store, secret, now: T0 }, input());
    expect(r.emailAccepted).toBe(false);
  });
});

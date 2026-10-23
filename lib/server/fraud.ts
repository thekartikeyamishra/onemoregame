import "server-only";
import { resolveMx } from "node:dns/promises";

/**
 * Anti-abuse rules for sign-ups and referrals.
 *
 * Penalty ladder (enforced in the waitlist routes):
 *   1. Bot signals (honeypot filled, submitted faster than a human could) → silently dropped.
 *   2. Disposable or undeliverable email → rejected with a clear message.
 *   3. Self-referral (same network or same mailbox) → referral voided, sign-up kept.
 *   4. A referrer who collects VOID_LIMIT voided referrals → account flagged:
 *      referral credit frozen and excluded from early waves until manually reviewed.
 */

export const VOID_LIMIT = 3;
export const MIN_HUMAN_MS = 2500;

// Common throwaway providers. Extend via DISPOSABLE_DOMAINS="a.com,b.com".
const DISPOSABLE = new Set(
  [
    "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com", "grr.la", "10minutemail.com",
    "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "throwawaymail.com",
    "yopmail.com", "yopmail.fr", "yopmail.net", "getnada.com", "nada.email", "dispostable.com", "trashmail.com",
    "trashmail.de", "maildrop.cc", "mintemail.com", "mohmal.com", "fakeinbox.com", "emailondeck.com",
    "spamgourmet.com", "mailnesia.com", "mytemp.email", "tempinbox.com", "burnermail.io", "moakt.com",
    "tmail.ws", "tmpmail.org", "tmpmail.net", "emailfake.com", "inboxkitten.com", "mailpoof.com",
    "luxusmail.org", "spambox.us", "33mail.com", "harakirimail.com", "mail.tm", "linshiyouxiang.net",
    ...(process.env.DISPOSABLE_DOMAINS?.split(",").map((d) => d.trim().toLowerCase()) ?? []),
  ].filter(Boolean)
);

export function domainOf(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/** Collapses aliases of the same mailbox so one person can't sign up many times. */
export function canonicalEmail(email: string): string {
  const [rawLocal, rawDomain] = email.trim().toLowerCase().split("@");
  let local = rawLocal ?? "";
  let domain = rawDomain ?? "";
  if (domain === "googlemail.com") domain = "gmail.com";
  local = local.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

export const isDisposable = (email: string) => DISPOSABLE.has(domainOf(email));

/** True when the domain can receive mail. Fails open on DNS timeouts. */
const KNOWN_MAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "yahoo.co.in", "icloud.com", "me.com", "proton.me", "protonmail.com", "rediffmail.com", "zoho.com", "aol.com", "gmx.com"]);

export async function canReceiveMail(email: string): Promise<boolean> {
  const domain = domainOf(email);
  if (!domain || !domain.includes(".")) return false;
  if (KNOWN_MAIL.has(domain)) return true;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    return records === null ? true : records.length > 0;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

export function referralCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const REF_PATTERN = /^[a-z0-9]{8}$/;

import "server-only";
import { site } from "@/lib/site";

/**
 * Transactional email through Resend's HTTP API (no SDK needed).
 * Set RESEND_API_KEY and EMAIL_FROM (a verified sender on your domain).
 * Without them, emails are skipped and flows still work (no double opt-in).
 */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  unsubscribeUrl?: string;
}): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
        headers: opts.unsubscribeUrl
          ? { "List-Unsubscribe": `<${opts.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layoutEmail(heading: string, body: string, button?: { href: string; label: string }, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#131a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
<tr><td><h1 style="font-size:22px;margin:0 0 12px">${esc(heading)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px">${body}</p>
${button ? `<a href="${button.href}" style="display:inline-block;background:#4338ff;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${esc(button.label)}</a>` : ""}
<p style="font-size:13px;color:#5b6478;margin:28px 0 0">${footer}</p>
<p style="font-size:13px;color:#5b6478;margin:8px 0 0">${esc(site.name)} · ${esc(site.location)} · <a href="${site.url}/privacy" style="color:#5b6478">Privacy</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export { esc };

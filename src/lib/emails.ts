import { site } from "./site";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string, footerHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b1020;font-family:Arial,Helvetica,sans-serif;color:#e8ecf6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#121a33;border-radius:16px;padding:32px">
<tr><td><p style="margin:0 0 24px;font-weight:700;letter-spacing:.12em;color:#3ee6f0">ONE MORE</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#ffffff">${escapeHtml(title)}</h1>${bodyHtml}
<p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#8b94b3">${footerHtml}</p></td></tr></table>
</td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#3ee6f0;color:#06101f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${escapeHtml(label)}</a></p>
<p style="font-size:12px;color:#8b94b3;word-break:break-all">Or paste this link into your browser:<br>${escapeHtml(href)}</p>`;
}

export function verificationEmail(link: string, unsubscribeUrl: string) {
  const subject = "Confirm your email to play ONE MORE";
  const text = `Confirm your email address within 48 hours to unlock the ONE MORE playtest
(Quick Play, the Daily Arena leaderboard, streaks and friend challenges):
${link}

If you saved a run as a guest, it's added to your profile when you confirm.

If you did not request this, ignore this email and nothing further will be sent.
Stop product updates: ${unsubscribeUrl}`;
  const html = layout(
    "Confirm your email to play",
    `<p style="line-height:1.6">Confirm your address within 48 hours to unlock Quick Play, the Daily Arena leaderboard, streaks and friend challenges.</p>
${button(link, "Confirm my email")}
<p style="line-height:1.6;color:#b9c1dc">If you saved a run as a guest, it's added to your profile when you confirm.</p>`,
    `If you did not request this, ignore this email and nothing further will be sent. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8b94b3">Stop product updates</a>.`,
  );
  return { subject, text, html };
}

export function invitationEmail(link: string, unsubscribeUrl: string, expiresDays: number) {
  const subject = "Your ONE MORE playtest invitation";
  const text = `A ONE MORE playtest spot is open for you.

Accept your invitation (valid for ${expiresDays} days, single use):
${link}

This link is personal. Please don't forward it.
Stop product updates: ${unsubscribeUrl}`;
  const html = layout(
    "Your playtest invitation",
    `<p style="line-height:1.6">A ONE MORE playtest spot is open for you. The link below is personal, single-use and valid for ${expiresDays} days.</p>
${button(link, "Accept invitation")}`,
    `Please don't forward this email. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8b94b3">Stop product updates</a>.`,
  );
  return { subject, text, html };
}

export function ownerCampusNotification(lead: { institution: string; role: string; size: string }) {
  const subject = `Campus Clash interest: ${lead.institution.slice(0, 60)}`;
  const text = `New Campus Clash organizer interest.\nInstitution: ${lead.institution}\nRole: ${lead.role}\nExpected size: ${lead.size}\nOpen the campusLeads collection in Firestore for contact details.\n${site.url}`;
  return { subject, text, html: `<pre>${escapeHtml(text)}</pre>` };
}

export function signInEmail(link: string) {
  const subject = "Your ONE MORE sign-in link";
  const text = `Use this link to sign in to the ONE MORE playtest on this device. It works once and expires in 15 minutes:
${link}

If you didn't ask for this, you can ignore this email.`;
  const html = layout("Sign in to play", `<p style="line-height:1.6">This link works once and expires in 15 minutes.</p>${button(link, "Sign in")}`, "If you didn't ask for this, you can ignore this email.");
  return { subject, text, html };
}

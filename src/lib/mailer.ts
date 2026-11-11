import { serverConfig } from "./env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Provider-side idempotency key so retries never send duplicates. */
  idempotencyKey: string;
  unsubscribeUrl?: string;
}

export type SendResult = { ok: true; providerId: string | null } | { ok: false; error: string };

export interface Mailer {
  send(msg: MailMessage): Promise<SendResult>;
}

class ConsoleMailer implements Mailer {
  async send(msg: MailMessage): Promise<SendResult> {
    // Development only (blocked in production by env.ts). Prints the message so links can be clicked locally.
    console.info(`\n[dev-mail] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
    return { ok: true, providerId: null };
  }
}

class ResendMailer implements Mailer {
  constructor(private apiKey: string, private from: string) {}
  async send(msg: MailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": msg.idempotencyKey.slice(0, 256),
        },
        body: JSON.stringify({
          from: this.from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          headers: msg.unsubscribeUrl
            ? { "List-Unsubscribe": `<${msg.unsubscribeUrl.replace("/unsubscribe?", "/api/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
            : undefined,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        // Keep the provider's reason (e.g. "The onemoregame.me domain is not verified") so it shows in the logs.
        const why = ((await res.json().catch(() => null)) as { message?: string; name?: string } | null);
        const error = `provider_status_${res.status}${why?.message ? `: ${String(why.message).slice(0, 200)}` : ""}`;
        console.error(`[mail] send failed (${res.status}) ${why?.name ?? ""} ${why?.message ?? ""}`.trim());
        return { ok: false, error };
      }
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, providerId: body.id ?? null };
    } catch (e) {
      console.error("[mail] provider unreachable", e instanceof Error ? e.message : e);
      return { ok: false, error: "provider_unreachable" };
    }
  }
}

class UnconfiguredMailer implements Mailer {
  async send(): Promise<SendResult> {
    console.error("[mail] not configured: set RESEND_API_KEY and MAIL_FROM (and verify the sending domain in Resend)");
    return { ok: false, error: "mailer_not_configured" };
  }
}

let override: Mailer | null = null;
export function setMailerForTests(m: Mailer | null) {
  override = m;
}

export function getMailer(): Mailer {
  if (override) return override;
  const cfg = serverConfig();
  if (cfg.mailProvider === "console") return new ConsoleMailer();
  if (cfg.resendApiKey && cfg.mailFrom) return new ResendMailer(cfg.resendApiKey, cfg.mailFrom);
  return new UnconfiguredMailer();
}

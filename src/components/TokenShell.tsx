import Link from "next/link";
import type { ReactNode } from "react";

export function TokenShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>{title}</h1>
        <div className="form-card">{children}</div>
      </div>
    </section>
  );
}

export function MissingToken() {
  return (
    <div className="notice notice--info">
      <strong>Link incomplete</strong>
      Open the full link from your email. Some mail apps break long links across lines. You can also <Link href="/early-access#request">request a new email</Link>.
    </div>
  );
}

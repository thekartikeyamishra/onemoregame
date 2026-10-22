import type { Metadata } from "next";
import { InviteForm } from "@/components/TokenForms";
import { MissingToken, TokenShell } from "@/components/TokenShell";

export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return (
    <TokenShell eyebrow="Playtest" title="Accept your invitation">
      {typeof token === "string" && token ? (
        <>
          <p className="muted">This invitation is personal and can be used once.</p>
          <InviteForm token={token} />
        </>
      ) : <MissingToken />}
    </TokenShell>
  );
}

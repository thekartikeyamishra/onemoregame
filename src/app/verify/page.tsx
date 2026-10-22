import type { Metadata } from "next";
import { VerifyForm } from "@/components/TokenForms";
import { MissingToken, TokenShell } from "@/components/TokenShell";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return (
    <TokenShell eyebrow="Early access" title="Confirm your email">
      {typeof token === "string" && token ? (
        <>
          <p className="muted">One click to confirm this address belongs to you.</p>
          <VerifyForm token={token} />
        </>
      ) : <MissingToken />}
    </TokenShell>
  );
}

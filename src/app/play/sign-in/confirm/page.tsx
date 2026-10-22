import type { Metadata } from "next";
import { ConfirmSignInForm } from "@/components/TokenForms";
import { MissingToken, TokenShell } from "@/components/TokenShell";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmSignIn({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return (
    <TokenShell eyebrow="Playtest" title="Sign in on this device">
      {typeof token === "string" && token ? <ConfirmSignInForm token={token} /> : <MissingToken />}
    </TokenShell>
  );
}

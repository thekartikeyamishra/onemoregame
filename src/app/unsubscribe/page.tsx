import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/TokenForms";
import { MissingToken, TokenShell } from "@/components/TokenShell";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return (
    <TokenShell eyebrow="Email preferences" title="Stop product updates">
      {typeof token === "string" && token ? <UnsubscribeForm token={token} /> : <MissingToken />}
    </TokenShell>
  );
}

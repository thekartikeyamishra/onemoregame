import type { Metadata } from "next";
import { SignInForm } from "@/components/TokenForms";
import { TokenShell } from "@/components/TokenShell";

export const metadata: Metadata = { title: "Sign in to play", robots: { index: false, follow: false } };

export default function SignInPage() {
  return (
    <TokenShell eyebrow="Playtest" title="Sign in to play">
      <p className="muted">For players who have confirmed their email. No password needed.</p>
      <SignInForm />
    </TokenShell>
  );
}

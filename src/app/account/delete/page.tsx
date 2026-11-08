import type { Metadata } from "next";
import Link from "next/link";
import { DeleteConfirm, DeleteRequest } from "@/components/DeleteAccount";
import { PageHero } from "@/components/PageHero";
import { checkDeletionToken } from "@/lib/account";
import { serverCtx } from "@/lib/server";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your ONE MORE account",
  description: "Request deletion of your ONE MORE account and all associated data.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/** Public deletion page (also the "delete account" URL given to Google Play and the App Store). */
export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let valid = false;
  if (token) { try { valid = await checkDeletionToken(await serverCtx(), token); } catch { valid = false; } }
  return (
    <>
      <PageHero eyebrow="Account" title="Delete your account" />
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 720, display: "grid", gap: "1.5rem" }}>
          {token && valid ? <DeleteConfirm token={token} /> : null}
          {token && !valid ? <div className="notice notice--err" role="alert">This link is invalid, already used or expired. Request a new one below.</div> : null}
          {!valid ? (
            <>
              <p>Signed in? Go to <Link href="/account">Your account</Link> to delete instantly. Otherwise, confirm by email:</p>
              <DeleteRequest />
            </>
          ) : null}
          <div className="form-card">
            <h2 style={{ marginTop: 0, fontSize: "var(--step-1)" }}>What gets deleted</h2>
            <ul className="small">
              <li>Your account (email address and gamer name), personal best, streaks and level progress.</li>
              <li>Your runs, Daily and weekly leaderboard entries, friend challenges you created, and feedback linked to you.</li>
              <li>Sign-in sessions and links.</li>
            </ul>
            <p className="small muted">Deletion is immediate and permanent. Encrypted backups held by our providers expire within 30 days. Battle rooms (gamer tag only) delete themselves after about 6 hours. Questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</p>
          </div>
        </div>
      </div>
    </>
  );
}

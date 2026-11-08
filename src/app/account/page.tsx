import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { DeleteNow, DeleteRequest } from "@/components/DeleteAccount";
import { PageHero } from "@/components/PageHero";
import { getPlayer } from "@/lib/game-service";
import { serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let signedIn = false, name: string | null = null, best = 0;
  try {
    const ctx = await serverCtx();
    const id = await currentPlayer(ctx);
    if (id) { signedIn = true; const p = await getPlayer(ctx.store, id); name = p.displayName; best = p.bestScore; }
  } catch { /* shown as signed out */ }
  return (
    <>
      <PageHero eyebrow="Account" title="Your account" />
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 720, display: "grid", gap: "1.5rem" }}>
          {signedIn ? (
            <>
              <div className="form-card">
                <p style={{ marginTop: 0 }}>Signed in{name ? <> as <b>{name}</b></> : null}. Personal best: <b>{best.toLocaleString("en-IN")}</b>.</p>
                <div className="btn-row">
                  <Link className="btn btn--primary" href="/play">Play</Link>
                  <form action={signOutAction}><button className="btn" type="submit">Sign out</button></form>
                </div>
              </div>
              <DeleteNow />
            </>
          ) : (
            <>
              <div className="form-card">
                <p style={{ marginTop: 0 }}>You&apos;re not signed in. <Link href="/play/sign-in">Sign in with your email</Link> to manage your account, or request deletion below.</p>
                <p className="small muted">Battle mode doesn&apos;t use accounts: gamer tags and battle rooms are deleted automatically after about 6 hours.</p>
              </div>
              <DeleteRequest />
            </>
          )}
          <p className="small muted">Questions about your data? <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> · <Link href="/privacy">Privacy policy</Link></p>
        </div>
      </div>
    </>
  );
}

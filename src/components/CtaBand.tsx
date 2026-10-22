import Link from "next/link";

export function CtaBand({ title = "Play today's arena", text = "Free in your browser, no sign-up. Confirm your email afterwards to save scores and join the leaderboard." }: { title?: string; text?: string }) {
  return (
    <div className="cta-band">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Link href="/play" className="btn btn--primary">Play now</Link>
    </div>
  );
}

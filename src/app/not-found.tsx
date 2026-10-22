import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Missed that one.</h1>
        <p className="lede">This page doesn&apos;t exist. One more try?</p>
        <div className="btn-row"><Link href="/" className="btn btn--primary">Go home</Link><Link href="/how-to-play" className="btn">How to play</Link></div>
      </div>
    </section>
  );
}

"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <p className="eyebrow">Error</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Something went wrong.</h1>
        <p className="lede">It&apos;s on our side. Please try again.</p>
        <button type="button" className="btn btn--primary" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}

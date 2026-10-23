import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-display text-7xl font-extrabold text-marigold" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-[clamp(2rem,1.6rem+2vw,3rem)] font-extrabold">This page wandered off</h1>
      <p className="mt-4 text-lg text-slate">The link may be old or mistyped. These are good places to pick up from:</p>
      <ul className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <li>
          <Link href="/" className="btn btn-primary">
            Home
          </Link>
        </li>
        <li>
          <Link href="/tools/app-cost-calculator" className="btn btn-ghost">
            Cost calculator
          </Link>
        </li>
        <li>
          <Link href="/blog" className="btn btn-ghost">
            Writing
          </Link>
        </li>
      </ul>
    </div>
  );
}

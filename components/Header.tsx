import Link from "next/link";
import { nav, site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 font-display text-lg font-bold tracking-tight" aria-label={`${site.name}, home`}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="transition-transform duration-300 group-hover:rotate-[-8deg]">
        <circle cx="17" cy="17" r="17" fill="var(--marigold)" />
        <circle cx="12" cy="15" r="2.6" fill="#131a33" />
        <circle cx="22" cy="15" r="2.6" fill="#131a33" />
        <path d="M11.5 21.5c3 3 8 3 11 0" stroke="#131a33" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      <span className="whitespace-nowrap">{site.name}</span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-[0.97rem] font-medium text-slate transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/early-access" className="btn btn-primary hidden !min-h-10 !px-4 text-[0.95rem] sm:inline-flex">
            Request an invite
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

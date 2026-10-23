import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Header";
import { StoreButtons } from "./StoreButtons";

const groups = [
  {
    title: "Explore",
    links: [
      { href: "/tools/app-cost-calculator", label: "App cost calculator" },
      { href: "/blog", label: "Writing" },
      { href: "/early-access", label: "Early access" },
    ],
  },
  {
    title: "Work",
    links: [
      { href: "/work-with-me", label: "Work with me" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  const social = [
    { href: site.social.github, label: "GitHub" },
    { href: site.social.linkedin, label: "LinkedIn" },
    { href: site.social.x, label: "X" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-sm text-slate">
            Independent app and AI product engineer in {site.location}. Building for clients and for my own studio.
          </p>
          <StoreButtons compact />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-slate">{g.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-indigo">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} {site.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-5">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="me noopener" target="_blank" className="hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-ink">
                Email
              </a>
            </li>
            <li>
              <a href="/feed.xml" className="hover:text-ink">
                RSS
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

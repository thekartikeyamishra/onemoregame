"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/lib/site";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the route changes (render-time state adjustment, no effect needed).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-paper px-5 pb-10 pt-4">
          <ul className="flex flex-col">
            {[{ href: "/", label: "Home" }, ...nav, { href: "/contact", label: "Contact" }].map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} className="block py-4 font-display text-2xl font-semibold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/early-access" className="btn btn-primary mt-8 w-full">
            Request an invite
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

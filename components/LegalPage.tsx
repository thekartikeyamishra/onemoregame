import { JsonLd, breadcrumbSchema } from "./JsonLd";

export function LegalPage({
  title,
  path,
  updated,
  intro,
  children,
}: {
  title: string;
  path: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 md:pt-20">
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: title, path }])} />
      <h1 className="text-[clamp(2.2rem,1.6rem+2.4vw,3.4rem)] font-extrabold">{title}</h1>
      <p className="mt-3 text-sm text-slate">
        Last updated <time dateTime={updated}>{new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
      </p>
      <p className="mt-6 text-lg text-slate">{intro}</p>
      <div className="prose mt-8">{children}</div>
    </div>
  );
}

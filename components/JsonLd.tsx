import { absoluteUrl, site } from "@/lib/site";

type Json = Record<string, unknown>;

/** Server-rendered structured data. `<` is escaped so content can never break out of the tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(Array.isArray(data) ? data : data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;

export function personSchema(): Json {
  const sameAs = [site.social.github, site.social.linkedin, site.social.x].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: site.author.name,
    url: site.url,
    image: absoluteUrl("/opengraph-image"),
    jobTitle: site.author.role,
    description: site.author.bio,
    email: `mailto:${site.email}`,
    homeLocation: { "@type": "Place", name: site.location },
    knowsAbout: site.author.knowsAbout,
    sameAs,
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: site.url,
    name: site.name,
    description: site.description,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

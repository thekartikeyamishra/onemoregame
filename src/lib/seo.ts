import type { Metadata } from "next";
import { absoluteUrl, site } from "./site";
import { STUDIO } from "./socials";

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const url = absoluteUrl(path);
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { url, title: path === "/" ? title : `${title} · ${site.name}`, description, type: "website", siteName: site.name },
    twitter: { title, description },
  };
}

export function breadcrumbLd(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      { "@type": "ListItem", position: 2, name, item: absoluteUrl(path) },
    ],
  };
}

/** VideoGame structured data describing only what is true and visible on the site (no ratings or reviews). */
export function videoGameLd() {
  return {
    "@type": "VideoGame",
    "@id": `${site.url}/#game`,
    name: site.name,
    url: absoluteUrl("/play"),
    description: site.description,
    genre: ["Arcade", "Casual"],
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any operating system with a modern web browser",
    playMode: "SinglePlayer",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/InStock", url: absoluteUrl("/play") },
    author: { "@type": "Person", name: STUDIO.creator },
    publisher: { "@type": "Organization", name: STUDIO.name },
    image: `${site.url}/opengraph-image`,
  };
}

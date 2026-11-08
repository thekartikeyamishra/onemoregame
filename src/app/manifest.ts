import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Installable web app (Android "Add to Home screen", desktop install) and the source of truth for the store apps. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ONE MORE: 60-second arcade",
    short_name: "ONE MORE",
    description: site.description,
    start_url: "/play?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0a0f1f",
    theme_color: "#0a0f1f",
    categories: ["games", "entertainment"],
    lang: "en-IN",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Daily Arena", url: "/play?source=shortcut", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
      { name: "Battle", url: "/battle?source=shortcut", icons: [{ src: "/brand/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

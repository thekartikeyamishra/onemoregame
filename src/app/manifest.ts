import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ONE MORE",
    short_name: "ONE MORE",
    description: "A skill-first browser arcade game in development.",
    start_url: "/",
    display: "browser",
    background_color: "#0a0f1f",
    theme_color: "#0a0f1f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

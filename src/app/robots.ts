import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const privatePaths = ["/api/", "/verify", "/invite", "/unsubscribe", "/r/", "/play/sign-in", "/c/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // The AdSense crawler must be able to read every page that could show ads.
      { userAgent: "Mediapartners-Google", allow: "/" },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

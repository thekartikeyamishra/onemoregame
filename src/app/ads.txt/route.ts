import { site } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Authorized Digital Sellers (https://onemoregame.me/ads.txt), exactly as AdSense asks for it:
 *   google.com, pub-4557897331416844, DIRECT, f08c47fec0942fa0
 * Always served (the publisher ID falls back to the built-in one), plain text, cacheable, no redirects.
 */
export function GET() {
  const pub = site.ads.client.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}

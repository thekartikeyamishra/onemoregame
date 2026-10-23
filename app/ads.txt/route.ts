import { ads } from "@/lib/site";

export const dynamic = "force-static";

/** ads.txt authorises Google to sell ads on this domain. Served only once AdSense is configured. */
export function GET() {
  const pub = ads.client.replace(/^ca-/, "");
  if (!pub) return new Response("# AdSense not configured yet\n", { headers: { "Content-Type": "text/plain" } });
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}

import { site } from "@/lib/site";

export const dynamic = "force-static";

/** Authorized Digital Sellers. Served only once a real AdSense publisher ID is configured. */
export function GET() {
  if (!site.ads.client) return new Response("Not found", { status: 404 });
  const pub = site.ads.client.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

import { site } from "@/lib/site";

export const dynamic = "force-static";

/** RFC 9116 security contact. */
export function GET() {
  const body = `Contact: mailto:${site.contactEmail}
Expires: 2027-10-01T00:00:00.000Z
Preferred-Languages: en, hi
Canonical: ${site.url}/.well-known/security.txt
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

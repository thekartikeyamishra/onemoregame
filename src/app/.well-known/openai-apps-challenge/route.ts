/**
 * OpenAI app-directory domain verification. When the ChatGPT app submission asks for it, put the exact challenge
 * token in the OPENAI_APPS_CHALLENGE environment variable (Vercel) and redeploy. The response is the token only.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const token = (process.env.OPENAI_APPS_CHALLENGE ?? "").trim();
  if (!token) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(token, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

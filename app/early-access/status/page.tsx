import Link from "next/link";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Early access status",
  description: "Confirmation of your early-access request.",
  path: "/early-access/status",
  noindex: true,
});

const copy = {
  confirmed: {
    title: "Email confirmed",
    body: "You're on the early-access list. Invites go out in small waves; you'll hear from me when yours is ready.",
  },
  removed: {
    title: "You've been removed",
    body: "Your email and invite record have been deleted. You won't receive further emails from the early-access list.",
  },
  invalid: {
    title: "That link didn't work",
    body: "It may have expired or been copied incompletely. Request your invite again, or contact me and I'll sort it out.",
  },
} as const;

export default async function Status({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const c = copy[(s as keyof typeof copy) ?? "invalid"] ?? copy.invalid;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-[clamp(2.2rem,1.6rem+2.4vw,3.4rem)] font-extrabold">{c.title}</h1>
      <p className="mt-4 text-lg text-slate">{c.body}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/early-access" className="btn btn-primary">
          Go to early access
        </Link>
        <Link href="/blog" className="btn btn-ghost">
          Read the writing
        </Link>
      </div>
    </div>
  );
}

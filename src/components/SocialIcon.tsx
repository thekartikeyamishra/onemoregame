import type { SocialId } from "@/lib/socials";

/** Simple monochrome glyphs (not brand logos), labelled by the surrounding link text. */
const paths: Record<SocialId, string> = {
  discord: "M7 8.5c3-1.5 7-1.5 10 0l1.5 7c-2 1.5-4 2-4 2l-1-1.5M7 8.5 5.5 15.5c2 1.5 4 2 4 2l1-1.5M9.5 12.5h.01M14.5 12.5h.01",
  youtube: "M3.5 8.5c0-1.5 1-2.5 2.5-2.7C8 5.6 10 5.5 12 5.5s4 .1 6 .3c1.5.2 2.5 1.2 2.5 2.7v7c0 1.5-1 2.5-2.5 2.7-2 .2-4 .3-6 .3s-4-.1-6-.3c-1.5-.2-2.5-1.2-2.5-2.7zM10.5 9.5v5l4-2.5z",
  instagram: "M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 7h.01",
  seevetech: "M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 7h.01",
  x: "M5 5l14 14M19 5 5 19",
  linkedin: "M5 9.5v9M5 5.5h.01M9.5 18.5v-5a3 3 0 0 1 6 0v5M9.5 9.5v9",
};

export function SocialIcon({ id, size = 18 }: { id: SocialId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[id]} />
    </svg>
  );
}

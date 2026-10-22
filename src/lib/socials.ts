/** Official ONE MORE / creator channels. Each has a job for players, used in prompts and on /community. */
export type SocialId = "discord" | "youtube" | "instagram" | "seevetech" | "x" | "linkedin";

export interface Social {
  id: SocialId;
  label: string;
  handle: string;
  href: string;
  /** Why a player would want to follow: shown in prompts and on /community. */
  pitch: string;
}

export const socials: Record<SocialId, Social> = {
  discord: { id: "discord", label: "Discord", handle: "ONE MORE community", href: "https://discord.gg/AHKEwYe9B", pitch: "Talk strategy for today's arena, join the weekly cup, report bugs and vote on the next power-up." },
  youtube: { id: "youtube", label: "YouTube", handle: "@kartikeyahere", href: "https://www.youtube.com/@kartikeyahere", pitch: "Devlogs and a weekly Top Runs video. Post your best run in Discord and it could be featured." },
  instagram: { id: "instagram", label: "Instagram", handle: "@kartikeyahere_", href: "https://www.instagram.com/kartikeyahere_", pitch: "Highlight reels and behind-the-scenes from the developer." },
  seevetech: { id: "seevetech", label: "Instagram", handle: "@seevetech", href: "https://www.instagram.com/seevetech", pitch: "SEEVE Tech, the studio behind ONE MORE: launches and what's next." },
  x: { id: "x", label: "X", handle: "@KartikeyahereX", href: "https://x.com/KartikeyahereX", pitch: "Each day's arena, patch notes and quick updates." },
  linkedin: { id: "linkedin", label: "LinkedIn", handle: "Kartikeya Mishra", href: "https://www.linkedin.com/in/thekartikeyamishra", pitch: "Building ONE MORE in public, plus Campus Clash partnerships for colleges and clubs." },
};

/** Order for footers and the community page. */
export const socialOrder: SocialId[] = ["discord", "youtube", "instagram", "seevetech", "x", "linkedin"];

export const STUDIO = { name: "SEEVE Tech", creator: "Kartikeya Mishra" } as const;

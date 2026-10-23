/**
 * Mitra's expression set, modelled on the smiley-face emoji range.
 * Each expression is a combination of eyes, mouth, brows and extras,
 * so new ones are a one-line addition.
 */

export type Eyes = "open" | "happy" | "wink" | "hearts" | "stars" | "closed" | "wide" | "shades" | "spiral" | "nerd";
export type Mouth = "smile" | "grin" | "laugh" | "o" | "small-o" | "flat" | "frown" | "wavy" | "tongue" | "smirk";
export type Brows = "none" | "raised" | "worried" | "think";
export type Extra = "blush" | "tear" | "joy-tears" | "sweat" | "zzz" | "confetti" | "sparkle";

export type ExpressionSpec = { emoji: string; label: string; eyes: Eyes; mouth: Mouth; brows: Brows; extras: Extra[] };

export const expressions = {
  neutral: { emoji: "🙂", label: "Calm", eyes: "open", mouth: "smile", brows: "none", extras: [] },
  happy: { emoji: "😊", label: "Happy", eyes: "happy", mouth: "smile", brows: "none", extras: ["blush"] },
  grin: { emoji: "😁", label: "Grinning", eyes: "happy", mouth: "grin", brows: "none", extras: [] },
  laugh: { emoji: "😂", label: "Laughing", eyes: "happy", mouth: "laugh", brows: "none", extras: ["joy-tears"] },
  wink: { emoji: "😉", label: "Winking", eyes: "wink", mouth: "smirk", brows: "none", extras: [] },
  love: { emoji: "😍", label: "In love", eyes: "hearts", mouth: "grin", brows: "none", extras: ["blush"] },
  starstruck: { emoji: "🤩", label: "Star-struck", eyes: "stars", mouth: "laugh", brows: "none", extras: ["sparkle"] },
  thinking: { emoji: "🤔", label: "Thinking", eyes: "open", mouth: "flat", brows: "think", extras: [] },
  surprised: { emoji: "😮", label: "Surprised", eyes: "wide", mouth: "o", brows: "raised", extras: [] },
  cool: { emoji: "😎", label: "Cool", eyes: "shades", mouth: "smirk", brows: "none", extras: [] },
  sleepy: { emoji: "😴", label: "Sleepy", eyes: "closed", mouth: "small-o", brows: "none", extras: ["zzz"] },
  sad: { emoji: "😢", label: "Sad", eyes: "open", mouth: "frown", brows: "worried", extras: ["tear"] },
  confused: { emoji: "😕", label: "Confused", eyes: "open", mouth: "wavy", brows: "worried", extras: [] },
  party: { emoji: "🥳", label: "Celebrating", eyes: "happy", mouth: "laugh", brows: "none", extras: ["confetti"] },
  nerd: { emoji: "🤓", label: "Nerding out", eyes: "nerd", mouth: "grin", brows: "none", extras: [] },
  dizzy: { emoji: "😵‍💫", label: "Dizzy", eyes: "spiral", mouth: "wavy", brows: "none", extras: [] },
  playful: { emoji: "😛", label: "Playful", eyes: "open", mouth: "tongue", brows: "none", extras: [] },
  relieved: { emoji: "😅", label: "Relieved", eyes: "happy", mouth: "grin", brows: "none", extras: ["sweat"] },
} as const satisfies Record<string, ExpressionSpec>;

export type Mood = keyof typeof expressions;

/** Moods used when the visitor clicks Mitra for fun, in order. */
export const clickCycle: Mood[] = ["grin", "wink", "playful", "love", "starstruck", "cool", "laugh", "nerd", "party"];

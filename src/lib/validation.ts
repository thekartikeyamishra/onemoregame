import { z } from "zod";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email({ message: "Enter a valid email address." })
  .transform(normalizeEmail);

export const audienceSchema = z.enum(["player", "organizer", "both"]);
export type Audience = z.infer<typeof audienceSchema>;

export const referralCodeSchema = z.string().regex(/^[a-hj-km-np-z2-9]{10}$/);

export const waitlistInputSchema = z.object({
  email: emailSchema,
  audience: audienceSchema.default("player"),
  updatesConsent: z.boolean().default(false),
  /** Requester confirms they are 18+ or a parent/guardian requesting for a child. */
  ageConfirmed: z.literal(true, { message: "Please confirm the age statement." }),
  ref: z.string().max(32).optional().nullable(),
  source: z
    .string()
    .max(40)
    .regex(/^[a-z0-9_.-]*$/i)
    .optional()
    .nullable(),
  /** Optional guest run ID to save to the player's profile after confirmation. */
  claimRunId: z.string().regex(/^[A-Za-z0-9_-]{8,40}$/).optional().nullable(),
  /** Honeypot: must be empty. */
  website: z.string().max(0).optional().default(""),
});
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;

export const campusInputSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  institution: z.string().trim().min(2, "Enter your institution or club.").max(120),
  role: z.enum(["student-organizer", "faculty-staff", "club-lead", "other"]),
  size: z.enum(["under-50", "50-200", "200-1000", "over-1000", "unsure"]),
  message: z.string().trim().max(1000).optional().default(""),
  website: z.string().max(0).optional().default(""),
});
export type CampusInput = z.infer<typeof campusInputSchema>;

/** Token format: "<docId>.<secret>" — docId is a non-sensitive hash/random id. */
export function splitToken(token: unknown): { id: string; secret: string } | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const m = /^([a-zA-Z0-9_-]{8,80})\.([a-zA-Z0-9_-]{20,80})$/.exec(token);
  return m ? { id: m[1], secret: m[2] } : null;
}

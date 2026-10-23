import { z } from "zod";
import { lab } from "./site";
import { budgets, timelines } from "./options";

export { budgets, timelines };

const labIds = lab.map((l) => l.id) as [string, ...string[]];

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  interests: z.array(z.enum(labIds)).max(lab.length).default([]),
  role: z.enum(["founder", "developer", "designer", "student", "business", "other"]).optional(),
  consent: z.literal(true, { message: "Please agree to receive invite emails." }),
  ref: z.string().trim().toLowerCase().max(16).optional(),
  source: z.string().max(40).optional(),
  lang: z.string().max(8).optional(),
  hp: z.string().max(200).optional(), // honeypot: real visitors never fill it
  t: z.number().int().nonnegative().optional(), // ms the form was open
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const inquirySchema = z.object({
  kind: z.enum(["project", "contact"]),
  name: z.string().trim().min(2, "Please add your name.").max(80),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
  company: z.string().trim().max(120).optional(),
  budget: z.enum(budgets.map((b) => b.id) as [string, ...string[]]).optional(),
  timeline: z.enum(timelines.map((t) => t.id) as [string, ...string[]]).optional(),
  message: z.string().trim().min(30, "A few sentences (30+ characters) help me reply properly.").max(4000),
  consent: z.literal(true, { message: "Please agree so I can reply to you." }),
  hp: z.string().max(200).optional(),
  t: z.number().int().nonnegative().optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const chatSchema = z.object({
  lang: z.string().max(8).default("en"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(600) }))
    .min(1)
    .max(8),
});

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

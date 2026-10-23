/** Form options shared by client forms and server validation (no zod here, keeps the client bundle small). */

export const budgets = [
  { id: "lt-3k", label: "Under $3,000 / ₹2.5L" },
  { id: "3-10k", label: "$3,000 – $10,000" },
  { id: "10-30k", label: "$10,000 – $30,000" },
  { id: "30k+", label: "Over $30,000" },
  { id: "unsure", label: "Not sure yet" },
] as const;

export const timelines = [
  { id: "asap", label: "As soon as possible" },
  { id: "1-3m", label: "In 1–3 months" },
  { id: "3m+", label: "In 3+ months" },
  { id: "exploring", label: "Just exploring" },
] as const;

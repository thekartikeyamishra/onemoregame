import type { ReactNode } from "react";

export interface Guide {
  slug: string;
  title: string;
  /** Meta description: unique, 120–160 characters. */
  description: string;
  category: "Getting better" | "Strategy" | "Organizers" | "Behind the game";
  published: string;
  updated: string;
  readMinutes: number;
  /** Sections drive the table of contents and heading hierarchy (each becomes an h2). */
  sections: Array<{ id: string; title: string; body: ReactNode }>;
  related: string[];
}

export type Availability = "live" | "dev" | "planned" | "soon" | "playtest";
const labels: Record<Availability, string> = { live: "Available", dev: "In development", planned: "Planned", soon: "Coming soon", playtest: "In playtest" };

export function StatusPill({ status }: { status: Availability }) {
  return <span className={`pill pill--${status}`}>{labels[status]}</span>;
}

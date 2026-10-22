import type { FaqItem } from "@/lib/content";

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <div className="answer"><p>{f.a}</p></div>
        </details>
      ))}
    </div>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify output is escaped for "<" to prevent breaking out of the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

// Quality gate for blog posts: run `npm run check:content` before publishing.
// Flags thin posts, weak metadata and missing internal links, the usual causes of
// "low-value content" rejections.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "content", "blog");
let failed = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
  if (data.draft) continue;
  const words = content.split(/\s+/).filter(Boolean).length;
  const internal = (content.match(/\]\(\/(?!\/)/g) || []).length;
  const issues = [];
  if (words < 900) issues.push(`only ${words} words (aim for 1,000+ of original substance)`);
  if (!data.title) issues.push("missing title");
  if (!data.description || data.description.length < 110 || data.description.length > 160) issues.push(`description is ${data.description?.length ?? 0} chars (110–160)`);
  if ((data.seoTitle ?? data.title ?? "").length > 62) issues.push("search title over 62 chars: add seoTitle");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date))) issues.push("date must be YYYY-MM-DD");
  if (internal < 3) issues.push(`${internal} internal links (aim for 3+)`);
  if (!/^[a-z0-9-]+\.md$/.test(file)) issues.push("file name must be lowercase-hyphenated (it's the URL)");
  if (/^#\s/m.test(content)) issues.push("don't use '#' headings; the page title is the only H1");
  console.log(`${issues.length ? "✗" : "✓"} ${file} (${words} words, ${internal} internal links)`);
  issues.forEach((i) => console.log(`    - ${i}`));
  if (issues.length) failed++;
}
process.exit(failed ? 1 : 0);

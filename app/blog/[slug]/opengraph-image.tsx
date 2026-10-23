import { getPost, getPosts } from "@/lib/blog";
import { ogImage, ogSize } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = "Article cover";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogImage({ title: post?.title ?? site.name, kicker: `Writing by ${site.name}` });
}

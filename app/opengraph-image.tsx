import { ogImage, ogSize } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: independent app and AI product engineer`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: site.tagline, kicker: site.name });
}

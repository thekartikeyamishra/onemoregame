import { ogImage, ogSize } from "@/lib/og";

export const alt = "App development cost calculator";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "What will your app cost to build?", kicker: "Free app cost calculator" });
}

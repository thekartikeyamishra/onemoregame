import { ImageResponse } from "next/og";
import { site } from "./site";

export const ogSize = { width: 1200, height: 630 };

const face = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 36 V20" stroke="#0e9f6e" stroke-width="5" stroke-linecap="round"/><path d="M100 22 C 88 8, 74 14, 76 24 C 86 28, 96 26, 100 22Z" fill="#34d399" stroke="#131a33" stroke-width="2.5"/><path d="M100 18 C 110 4, 126 8, 124 18 C 116 24, 106 22, 100 18Z" fill="#0e9f6e" stroke="#131a33" stroke-width="2.5"/><path d="M100 34 C 152 34, 182 68, 180 112 C 178 158, 146 186, 100 186 C 54 186, 22 158, 20 112 C 18 68, 48 34, 100 34Z" fill="#ffb627" stroke="#131a33" stroke-width="4"/><path d="M60 100 Q74 84 88 100" stroke="#131a33" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="126" cy="96" rx="14" ry="17" fill="#fff" stroke="#131a33" stroke-width="3"/><circle cx="128" cy="98" r="7.5" fill="#131a33"/><path d="M76 131 Q100 164 124 131 Z" fill="#131a33"/><path d="M80 133 H120 Q118 139 113 141 H87 Q82 139 80 133Z" fill="#fff"/></svg>`
)}`;

export function ogImage({ title, kicker }: { title: string; kicker: string }) {
  const size = title.length > 70 ? 54 : title.length > 45 ? 64 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f7fb", padding: 72, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 820 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#4338ff", fontWeight: 700 }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: size, lineHeight: 1.05, color: "#131a33", fontWeight: 800, letterSpacing: -2 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#5b6478" }}>{site.url.replace(/^https?:\/\//, "")}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={face} width={300} height={300} alt="" style={{ position: "absolute", right: 60, bottom: 150 }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 16, background: "#4338ff", display: "flex" }} />
      </div>
    ),
    ogSize
  );
}

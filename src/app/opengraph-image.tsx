import { ImageResponse } from "next/og";

export const alt = "ONE MORE — One minute. One challenge. One more.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0f1f", color: "#eef1fa", padding: 80, flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: -80, top: -80, width: 560, height: 560, borderRadius: 9999, border: "3px solid rgba(62,230,240,0.5)", display: "flex" }} />
        <div style={{ position: "absolute", right: 60, top: 60, width: 280, height: 280, borderRadius: 9999, border: "2px dashed rgba(139,123,255,0.5)", display: "flex" }} />
        <div style={{ position: "absolute", right: 180, top: 180, width: 40, height: 40, background: "#ffbf47", transform: "rotate(45deg)", display: "flex" }} />
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 8, color: "#3ee6f0", fontWeight: 700 }}>ONE MORE</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, display: "flex", flexDirection: "column" }}>
            <span>One minute.</span><span>One challenge.</span><span style={{ color: "#3ee6f0" }}>One more.</span>
          </div>
          <div style={{ fontSize: 28, color: "#a9b2cf", marginTop: 28, display: "flex" }}>A skill-first browser arcade game · Play free today</div>
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffb627" }}>
        <svg width="150" height="150" viewBox="0 0 34 34">
          <circle cx="12" cy="15" r="2.6" fill="#131a33" />
          <circle cx="22" cy="15" r="2.6" fill="#131a33" />
          <path d="M11.5 21.5c3 3 8 3 11 0" stroke="#131a33" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    ),
    size
  );
}

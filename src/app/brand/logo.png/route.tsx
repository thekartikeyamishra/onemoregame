import { ImageResponse } from "next/og";

/** 1:1 PNG logo on a solid background plate (marketplace and directory listings): /brand/logo.png */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1f" }}>
        <div style={{ width: 336, height: 336, borderRadius: 9999, border: "48px solid #3ee6f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 128, height: 128, borderRadius: 9999, background: "#ffbf47", display: "flex" }} />
        </div>
      </div>
    ),
    { width: 512, height: 512, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}

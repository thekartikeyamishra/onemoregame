import { ImageResponse } from "next/og";

/**
 * The ONE MORE mark as a PNG at any size. `padded` leaves the 20% safe zone Android needs for maskable
 * (adaptive) icons, so launchers can crop to circles or squircles without cutting the logo.
 */
export function brandIcon(size: number, padded = false) {
  const ring = Math.round(size * (padded ? 0.5 : 0.66));
  const border = Math.round(ring * 0.143);
  const dot = Math.round(ring * 0.38);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1f" }}>
        <div style={{ width: ring, height: ring, borderRadius: 9999, border: `${border}px solid #3ee6f0`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: dot, height: dot, borderRadius: 9999, background: "#ffbf47", display: "flex" }} />
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}

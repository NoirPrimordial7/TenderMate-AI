import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const alt = "NividaIQ — AI tender analysis for India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#F4F2ED",
          color: "#101010",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ position: "absolute", width: 510, height: 510, right: -80, top: -95, display: "flex", background: "#6C4DFF", transform: "rotate(8deg)" }} />
        <div style={{ position: "absolute", width: 360, height: 220, right: 40, bottom: -70, display: "flex", background: "#146CFF", transform: "rotate(-4deg)" }} />
        <div style={{ position: "absolute", width: 120, height: 18, left: 72, top: 66, display: "flex", background: "#FF5A36" }} />
        <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 76px 68px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 800, letterSpacing: -1.5 }}>
            <div style={{ width: 58, height: 58, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#F4F2ED", background: "#6C4DFF", fontSize: 38, fontWeight: 900 }}>N</div>
            {BRAND.name}
          </div>
          <div style={{ maxWidth: 850, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 85, lineHeight: 0.92, fontWeight: 900, letterSpacing: -5 }}>UNDERSTAND THE TENDER.</div>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16, fontSize: 31, fontWeight: 700 }}>
              BEFORE YOU BID.
              <span style={{ width: 22, height: 22, display: "flex", borderRadius: 999, background: "#D7FF33", border: "3px solid #101010" }} />
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 23, color: "#4a4844" }}>AI tender analysis for Indian MSMEs · Eligibility · Documents · EMD · Deadlines · Risks</div>
        </div>
      </div>
    ),
    size
  );
}

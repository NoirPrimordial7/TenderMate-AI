import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 38, color: "#F4F2ED", background: "#6C4DFF", fontFamily: "Arial, sans-serif", fontSize: 116, fontWeight: 900, letterSpacing: -12 }}>
        N<span style={{ position: "absolute", right: 24, bottom: 24, width: 26, height: 26, display: "flex", borderRadius: 999, background: "#D7FF33", border: "4px solid #101010" }} />
      </div>
    ),
    size
  );
}

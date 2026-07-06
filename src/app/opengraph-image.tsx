import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AnimeVerse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 64,
          background: "linear-gradient(135deg, #0a0a12 0%, #1a1035 40%, #3b0764 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ▶
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.9 }}>
            AnimeVerse
          </span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, maxWidth: 900 }}>
          Descubra animes com UI viva e curadoria inteligente
        </div>
        <div style={{ fontSize: 26, marginTop: 20, opacity: 0.75 }}>
          Streaming premium · Recomendações · Hidden gems
        </div>
      </div>
    ),
    { ...size },
  );
}

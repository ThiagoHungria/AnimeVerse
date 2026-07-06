import { ImageResponse } from "next/og";
import { animeService } from "@/services/animeService";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anime = await animeService.getById(id).catch(() => null);

  const title = anime?.title ?? "AnimeVerse";
  const rating = anime?.rating ? `${anime.rating.toFixed(1)} ★` : "";
  const genres = anime?.genres.slice(0, 3).join(" · ") ?? "Anime";
  const hue = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(145deg, hsl(${hue} 60% 18%) 0%, #08080c 55%, hsl(${(hue + 60) % 360} 55% 28%) 100%)`,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {anime?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={anime.image}
            alt=""
            width={340}
            height={510}
            style={{
              margin: 48,
              borderRadius: 20,
              objectFit: "cover",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            }}
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 48,
            flex: 1,
          }}
        >
          <div style={{ fontSize: 22, opacity: 0.7, marginBottom: 12 }}>
            AnimeVerse
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: 16,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 24, opacity: 0.85 }}>
            {rating && <span>{rating}</span>}
            <span>{genres}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

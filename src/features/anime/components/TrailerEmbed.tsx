"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Lazy YouTube trailer embed (loads the iframe only after the user clicks). */
export function TrailerEmbed({
  embedUrl,
  poster,
  title,
}: {
  embedUrl: string;
  poster?: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
        <iframe
          src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
          title={`Trailer de ${title}`}
          allow="accelerated-encoder; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Reproduzir trailer de ${title}`}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
      style={
        poster
          ? {
              backgroundImage: `url(${poster})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/20" />
      <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-gradient shadow-xl transition-transform group-hover:scale-110">
        <Play className="size-7 fill-white text-white" />
      </span>
      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
        Assistir trailer
      </span>
    </button>
  );
}

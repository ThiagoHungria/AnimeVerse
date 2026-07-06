"use client";

import { useEffect, useMemo, useState } from "react";
import {
  paletteFromAnimeId,
  type AnimePalette,
} from "@/utils/colorSystem";
import { buildPaletteFromImage } from "@/utils/colorExtractor";

/** Extract or derive a cinematic palette from anime artwork. */
export function useDominantColor(
  imageUrl: string | undefined,
  animeId: string,
): AnimePalette {
  const fallback = useMemo(() => paletteFromAnimeId(animeId), [animeId]);
  const [palette, setPalette] = useState<AnimePalette>(fallback);

  useEffect(() => {
    if (!imageUrl) return;

    let cancelled = false;
    buildPaletteFromImage(imageUrl, animeId).then((next) => {
      if (!cancelled) setPalette(next);
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, animeId]);

  return imageUrl ? palette : fallback;
}

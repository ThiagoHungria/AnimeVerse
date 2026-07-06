/**
 * Multi-color extraction from anime artwork — Shinsu-style dynamic identity.
 * Samples dominant hues from cover/banner and builds cinematic palette.
 */

import {
  paletteFromHue,
  paletteFromAnimeId,
  rgbToHue,
  type AnimePalette,
} from "@/utils/colorSystem";

export interface ExtractedColors {
  dominant: string;
  secondary: string;
  accent: string;
  hues: number[];
}

const CACHE = new Map<string, ExtractedColors>();

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** Bucket pixels into hue histogram, return top N hues. */
function topHuesFromPixels(
  data: Uint8ClampedArray,
  count: number,
): number[] {
  const buckets = new Array<number>(36).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0;
    if (alpha < 128) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const brightness = (r + g + b) / 3;
    if (brightness < 30 || brightness > 230) continue;
    const hue = rgbToHue(r, g, b);
    buckets[Math.floor(hue / 10)] += 1;
  }

  return buckets
    .map((weight, idx) => ({ hue: idx * 10 + 5, weight }))
    .filter((b) => b.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((b) => b.hue);
}

/** Extract up to 3 dominant hues from image URL via canvas sampling. */
export async function extractColorsFromImage(
  imageUrl: string,
): Promise<ExtractedColors | null> {
  if (typeof window === "undefined") return null;

  const cached = CACHE.get(imageUrl);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const hues = topHuesFromPixels(data, 3);

        if (hues.length === 0) {
          resolve(null);
          return;
        }

        const primary = hues[0] ?? 220;
        const secondary = hues[1] ?? (primary + 40) % 360;
        const accent = hues[2] ?? (primary + 320) % 360;

        const result: ExtractedColors = {
          dominant: hsl(primary, 72, 52),
          secondary: hsl(secondary, 65, 42),
          accent: hsl(accent, 80, 58),
          hues: [primary, secondary, accent],
        };
        CACHE.set(imageUrl, result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/** Build full AnimePalette from extracted colors or fallback id. */
export async function buildPaletteFromImage(
  imageUrl: string,
  fallbackId: string,
): Promise<AnimePalette> {
  const extracted = await extractColorsFromImage(imageUrl);
  if (!extracted) return paletteFromAnimeId(fallbackId);

  const primaryHue = extracted.hues[0] ?? 220;
  const base = paletteFromHue(primaryHue);
  return {
    ...base,
    primary: extracted.dominant,
    secondary: extracted.secondary,
    accent: extracted.accent,
    gradient: `linear-gradient(135deg, ${extracted.dominant} 0%, ${extracted.secondary} 50%, ${extracted.accent} 100%)`,
    glow: `0 0 80px ${extracted.dominant}40`,
  };
}

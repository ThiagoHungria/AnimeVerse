/** Dynamic UI palette derived from anime artwork. */

export interface AnimePalette {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  glow: string;
  textOnPrimary: string;
}

const PALETTE_CACHE = new Map<string, AnimePalette>();

/** Deterministic hue from any string (SSR-safe fallback). */
export function hashToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** Build a cinematic palette from a hue angle. */
export function paletteFromHue(hue: number): AnimePalette {
  const primary = hsl(hue, 72, 52);
  const secondary = hsl((hue + 40) % 360, 65, 42);
  const accent = hsl((hue + 320) % 360, 80, 62);
  return {
    primary,
    secondary,
    accent,
    gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 45%, ${accent} 100%)`,
    glow: `0 0 80px ${hsl(hue, 80, 50)}40`,
    textOnPrimary: "#ffffff",
  };
}

/** Fallback palette when image extraction is unavailable. */
export function paletteFromAnimeId(animeId: string): AnimePalette {
  const cached = PALETTE_CACHE.get(`id:${animeId}`);
  if (cached) return cached;
  const palette = paletteFromHue(hashToHue(animeId));
  PALETTE_CACHE.set(`id:${animeId}`, palette);
  return palette;
}

/** Parse rgb(r,g,b) or #hex to hue. */
export function rgbToHue(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return hashToHue(`${r}${g}${b}`);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }
  return Math.round(h);
}

/** Client-side dominant color extraction via canvas sampling. */
export async function extractDominantColorFromImage(
  imageUrl: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3] ?? 0;
          if (alpha < 128) continue;
          const pr = data[i] ?? 0;
          const pg = data[i + 1] ?? 0;
          const pb = data[i + 2] ?? 0;
          const brightness = (pr + pg + pb) / 3;
          if (brightness < 25 || brightness > 235) continue;
          r += pr;
          g += pg;
          b += pb;
          count++;
        }

        if (count === 0) {
          resolve(null);
          return;
        }
        resolve(
          hsl(rgbToHue(r / count, g / count, b / count), 70, 50),
        );
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export async function paletteFromImage(
  imageUrl: string,
  fallbackId: string,
): Promise<AnimePalette> {
  const cacheKey = `img:${imageUrl}`;
  const cached = PALETTE_CACHE.get(cacheKey);
  if (cached) return cached;

  const dominant = await extractDominantColorFromImage(imageUrl);
  let palette: AnimePalette;

  if (dominant) {
    const match = dominant.match(/hsl\((\d+)/);
    const hue = match ? Number(match[1]) : hashToHue(fallbackId);
    palette = paletteFromHue(hue);
  } else {
    palette = paletteFromAnimeId(fallbackId);
  }

  PALETTE_CACHE.set(cacheKey, palette);
  return palette;
}

/** CSS custom properties for dynamic theming. */
export function paletteToCssVars(palette: AnimePalette): Record<string, string> {
  return {
    "--anime-primary": palette.primary,
    "--anime-secondary": palette.secondary,
    "--anime-accent": palette.accent,
    "--anime-gradient": palette.gradient,
    "--anime-glow": palette.glow,
  };
}

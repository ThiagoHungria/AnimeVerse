/**
 * Lightweight embedding engine — genre/theme vectors + cosine similarity.
 *
 * No external ML deps. Designed as a drop-in upgrade path: swap vectorize()
 * for real embeddings later while keeping the same API surface.
 */

import type { ExternalAnimeDto } from "./jikan.service";

export type TasteProfile = Record<string, number>;

const VOCAB_CACHE = new Map<string, string[]>();

function vocabulary(pool: ExternalAnimeDto[]): string[] {
  const key = pool.map((a) => a.id).join(",");
  const hit = VOCAB_CACHE.get(key);
  if (hit) return hit;

  const set = new Set<string>();
  for (const anime of pool) {
    for (const t of [...anime.genres, ...anime.themes]) set.add(t);
  }
  const vocab = [...set].sort();
  VOCAB_CACHE.set(key, vocab);
  return vocab;
}

/** Sparse vector: trait → weight. */
export function vectorizeTraits(
  traits: string[],
  vocab: string[],
): Float32Array {
  const vec = new Float32Array(vocab.length);
  for (const trait of traits) {
    const idx = vocab.indexOf(trait);
    if (idx >= 0) vec[idx] += 1;
  }
  return vec;
}

export function vectorizeAnime(
  anime: ExternalAnimeDto,
  vocab: string[],
): Float32Array {
  const traits = [...anime.genres, ...anime.themes];
  const vec = vectorizeTraits(traits, vocab);
  const quality = (anime.score ?? 0) / 10;
  const pop = anime.popularity
    ? 1 - Math.min(1, Math.log10(anime.popularity) / 4)
    : 0.3;
  // Blend global signals into vector magnitude
  const scale = 0.7 + quality * 0.2 + pop * 0.1;
  for (let i = 0; i < vec.length; i++) vec[i] *= scale;
  return vec;
}

export function vectorizeProfile(
  profile: TasteProfile,
  vocab: string[],
): Float32Array {
  const vec = new Float32Array(vocab.length);
  for (const [trait, weight] of Object.entries(profile)) {
    const idx = vocab.indexOf(trait);
    if (idx >= 0) vec[idx] = weight;
  }
  return vec;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function embeddingScore(
  anime: ExternalAnimeDto,
  profile: TasteProfile,
  vocab: string[],
): number {
  if (Object.keys(profile).length === 0) return 0;
  const userVec = vectorizeProfile(profile, vocab);
  const animeVec = vectorizeAnime(anime, vocab);
  return cosineSimilarity(userVec, animeVec);
}

export function recommendWithEmbeddings(
  pool: ExternalAnimeDto[],
  profile: TasteProfile,
  excludeIds: number[],
  limit = 18,
): ExternalAnimeDto[] {
  const exclude = new Set(excludeIds);
  const vocab = vocabulary(pool);
  const hasTaste = Object.keys(profile).length > 0;

  return pool
    .filter((a) => !exclude.has(a.id))
    .map((a) => {
      const emb = hasTaste ? embeddingScore(a, profile, vocab) : 0;
      const quality = (a.score ?? 0) / 10;
      const pop = a.popularity
        ? 1 - Math.min(1, Math.log10(a.popularity) / 4)
        : 0.2;
      const score = hasTaste
        ? emb * 0.55 + quality * 0.3 + pop * 0.15
        : quality * 0.6 + pop * 0.4;
      return { anime: a, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.anime);
}

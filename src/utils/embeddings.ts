/**
 * Client-side embedding helpers (mirrors backend embedding.service.ts).
 * Enables hybrid scoring in recommendationEngine without network calls.
 */

import type { AnimeSummary } from "@/types";
import type { TasteProfile } from "@/services/intelligenceEngine";

function traitsOf(anime: AnimeSummary): string[] {
  return [...anime.genres, ...anime.themes, ...anime.demographics];
}

function vocabulary(pool: AnimeSummary[]): string[] {
  const set = new Set<string>();
  for (const anime of pool) {
    for (const t of traitsOf(anime)) set.add(t);
  }
  return [...set].sort();
}

function vectorizeTraits(traits: string[], vocab: string[]): Float32Array {
  const vec = new Float32Array(vocab.length);
  for (const trait of traits) {
    const idx = vocab.indexOf(trait);
    if (idx >= 0) vec[idx] += 1;
  }
  return vec;
}

function vectorizeProfile(profile: TasteProfile, vocab: string[]): Float32Array {
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

export function embeddingAffinity(
  anime: AnimeSummary,
  profile: TasteProfile,
  vocab: string[],
): number {
  if (Object.keys(profile).length === 0) return 0;
  const userVec = vectorizeProfile(profile, vocab);
  const animeVec = vectorizeTraits(traitsOf(anime), vocab);
  return cosineSimilarity(userVec, animeVec);
}

export function buildVocabulary(pool: AnimeSummary[]): string[] {
  return vocabulary(pool);
}

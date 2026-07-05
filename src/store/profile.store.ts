import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TasteProfile } from "@/services/intelligenceEngine";

const MAX_VIEWED = 100;
const PREFERRED_WEIGHT = 5;

interface ProfileState {
  /** Learned affinity per genre/theme/demographic from views & favorites. */
  genreScores: Record<string, number>;
  /** Genres the user explicitly selected on their profile. */
  preferredGenres: string[];
  /** Recently viewed anime ids (newest first). */
  viewedAnimeIds: string[];
  /** Record an anime view, boosting affinity for its traits. */
  recordView: (animeId: string, traits: string[]) => void;
  /** Boost affinity when the user favorites something. */
  recordFavorite: (traits: string[]) => void;
  togglePreferredGenre: (genre: string) => void;
  reset: () => void;
}

function bump(
  scores: Record<string, number>,
  traits: string[],
  weight: number,
): Record<string, number> {
  const next = { ...scores };
  for (const trait of traits) {
    next[trait] = (next[trait] ?? 0) + weight;
  }
  return next;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      genreScores: {},
      preferredGenres: [],
      viewedAnimeIds: [],
      recordView: (animeId, traits) =>
        set((state) => ({
          genreScores: bump(state.genreScores, traits, 1),
          viewedAnimeIds: [
            animeId,
            ...state.viewedAnimeIds.filter((id) => id !== animeId),
          ].slice(0, MAX_VIEWED),
        })),
      recordFavorite: (traits) =>
        set((state) => ({ genreScores: bump(state.genreScores, traits, 3) })),
      togglePreferredGenre: (genre) =>
        set((state) => ({
          preferredGenres: state.preferredGenres.includes(genre)
            ? state.preferredGenres.filter((g) => g !== genre)
            : [...state.preferredGenres, genre],
        })),
      reset: () =>
        set({ genreScores: {}, preferredGenres: [], viewedAnimeIds: [] }),
    }),
    { name: "animeverse:profile" },
  ),
);

/** Combine learned affinity + explicit preferences into a taste profile. */
export function buildTasteProfile(state: {
  genreScores: Record<string, number>;
  preferredGenres: string[];
}): TasteProfile {
  const profile: TasteProfile = { ...state.genreScores };
  for (const genre of state.preferredGenres) {
    profile[genre] = (profile[genre] ?? 0) + PREFERRED_WEIGHT;
  }
  return profile;
}

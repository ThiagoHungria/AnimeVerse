import { useMemo } from "react";
import { useDiscoveryPool } from "@/features/anime/hooks/useAnimeQueries";
import { useHydrated } from "@/hooks/useHydrated";
import { useProfileStore, buildTasteProfile } from "@/store/profile.store";
import { useFavoritesStore } from "@/store/favorites.store";
import {
  recommend,
  buildDiscoveryCollections,
  getHiddenGems,
} from "@/services/intelligenceEngine";
import type { TasteProfile } from "@/services/intelligenceEngine";

/** Build the combined taste profile from the persisted profile store. */
export function useTasteProfile(): TasteProfile {
  const genreScores = useProfileStore((s) => s.genreScores);
  const preferredGenres = useProfileStore((s) => s.preferredGenres);
  return useMemo(
    () => buildTasteProfile({ genreScores, preferredGenres }),
    [genreScores, preferredGenres],
  );
}

/** Personalized "Recommended for you" list (falls back to top-rated). */
export function useRecommended(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const hydrated = useHydrated();
  const profile = useTasteProfile();
  const favorites = useFavoritesStore((s) => s.items);

  const exclude = useMemo(() => favorites.map((f) => f.id), [favorites]);
  const personalized = hydrated && Object.keys(profile).length > 0;

  const recommendations = useMemo(() => {
    if (!pool) return [];
    return recommend(pool, personalized ? profile : {}, { exclude, limit });
  }, [pool, profile, personalized, exclude, limit]);

  return { recommendations, isLoading, personalized };
}

/** Smart discovery collections for the Explore page. */
export function useDiscoveryCollections() {
  const { data: pool, isLoading } = useDiscoveryPool();
  const collections = useMemo(
    () => (pool ? buildDiscoveryCollections(pool) : []),
    [pool],
  );
  return { collections, isLoading };
}

/** Hidden gems: highly rated but under-discovered animes. */
export function useHiddenGems(limit = 18) {
  const { data: pool, isLoading } = useDiscoveryPool();
  const hiddenGems = useMemo(
    () => (pool ? getHiddenGems(pool, limit) : []),
    [pool, limit],
  );
  return { hiddenGems, isLoading };
}

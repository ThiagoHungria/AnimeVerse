import { useQuery } from "@tanstack/react-query";
import { animeService, type SearchParams } from "@/services/animeService";

/**
 * Centralized React Query keys + hooks.
 *
 * Every hook talks to the source-agnostic `animeService` (never `malApi`
 * directly). Catalog data is cached aggressively because the underlying MAL
 * data changes slowly and the provider is rate-limited.
 */

const CATALOG = {
  staleTime: 1000 * 60 * 30, // 30 min
  gcTime: 1000 * 60 * 60, // 1 h
};

export const queryKeys = {
  trending: ["trending"] as const,
  popular: ["popular"] as const,
  topRated: ["topRated"] as const,
  season: ["season"] as const,
  featured: ["featured"] as const,
  genres: ["genres"] as const,
  discoveryPool: ["discoveryPool"] as const,
  anime: (id: string) => ["anime", id] as const,
  similar: (id: string) => ["similar", id] as const,
  search: (params: SearchParams) => ["search", params] as const,
};

export const useTrending = () =>
  useQuery({
    queryKey: queryKeys.trending,
    queryFn: () => animeService.getTrending(),
    ...CATALOG,
  });

export const usePopular = () =>
  useQuery({
    queryKey: queryKeys.popular,
    queryFn: () => animeService.getPopular(),
    ...CATALOG,
  });

export const useTopRated = () =>
  useQuery({
    queryKey: queryKeys.topRated,
    queryFn: () => animeService.getTopRated(),
    ...CATALOG,
  });

export const useSeasonNow = () =>
  useQuery({
    queryKey: queryKeys.season,
    queryFn: () => animeService.getSeasonNow(),
    ...CATALOG,
  });

export const useFeatured = () =>
  useQuery({
    queryKey: queryKeys.featured,
    queryFn: () => animeService.getFeatured(),
    ...CATALOG,
  });

export const useGenres = () =>
  useQuery({
    queryKey: queryKeys.genres,
    queryFn: () => animeService.getGenres(),
    ...CATALOG,
  });

export const useDiscoveryPool = () =>
  useQuery({
    queryKey: queryKeys.discoveryPool,
    queryFn: () => animeService.getDiscoveryPool(),
    ...CATALOG,
  });

export const useAnime = (id: string) =>
  useQuery({
    queryKey: queryKeys.anime(id),
    queryFn: () => animeService.getById(id),
    enabled: Boolean(id),
    ...CATALOG,
  });

export const useSimilar = (id: string) =>
  useQuery({
    queryKey: queryKeys.similar(id),
    queryFn: () => animeService.getSimilar(id),
    enabled: Boolean(id),
    ...CATALOG,
  });

export const useSearch = (params: SearchParams, enabled = true) =>
  useQuery({
    queryKey: queryKeys.search(params),
    queryFn: () => animeService.search(params),
    enabled,
    staleTime: 1000 * 60 * 5,
  });

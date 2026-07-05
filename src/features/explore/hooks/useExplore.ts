import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  animeService,
  type DiscoverFilters,
} from "@/services/animeService";

/** True when at least one discovery filter is active. */
export function hasActiveFilters(filters: DiscoverFilters): boolean {
  return Boolean(
    filters.genre ||
      filters.year ||
      filters.season ||
      filters.minScore ||
      filters.status ||
      filters.type ||
      filters.sort,
  );
}

/** Advanced, multi-criteria discovery query (Explore page). */
export function useDiscover(filters: DiscoverFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["discover", filters],
    queryFn: () => animeService.discover(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hydrate a backend recommendation ranking into full display records.
 *
 * The backend returns a slim, ranked list (malId + reasons + score + trending).
 * The client already has fully-enriched AnimeSummary objects (smartTags,
 * demographics, studios, ...) in its discovery pool, so we join by `malId` to
 * recover the rich fields the cards need, without any backend schema change.
 *
 * Resolution order per item:
 *   1. discovery pool hit (full enrichment)
 *   2. optional `getById` resolver (e.g. a secondary cache)
 *   3. `dtoToSummary` fallback (slim record; empty smartTags/demographics)
 *
 * Backend ranking order is always preserved.
 */

import type { AnimeSummary } from "@/types";
import type { AnimeSummaryDto, RecommendationReason } from "@/services/apiClient";
import { dtoToSummary } from "@/services/dtoMappers";

/** AnimeSummary enriched with the backend recommendation signals. */
export interface HydratedRecommendation extends AnimeSummary {
  reasons: RecommendationReason[];
  score?: number;
  trending?: boolean;
}

export function hydrateRecommendations(
  dtos: AnimeSummaryDto[],
  pool: AnimeSummary[] | undefined,
  getById?: (malId: number) => AnimeSummary | undefined,
): HydratedRecommendation[] {
  const byMalId = new Map<number, AnimeSummary>();
  for (const anime of pool ?? []) byMalId.set(anime.malId, anime);

  return dtos.map((dto) => {
    const base =
      byMalId.get(dto.malId) ?? getById?.(dto.malId) ?? dtoToSummary(dto);
    return {
      ...base,
      reasons: dto.reasons ?? [],
      score: dto.score,
      trending: dto.trending,
    };
  });
}

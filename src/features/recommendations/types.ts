import type { AnimeSummary } from "@/types";
import type { RecommendationReason } from "@/services/apiClient";

export type { RecommendationReason } from "@/services/apiClient";

/**
 * An {@link AnimeSummary} that may optionally carry recommendation
 * explanations. Cards accept this shape so a plain `AnimeSummary` (no reasons)
 * remains fully assignable and unchanged.
 */
export type RecommendationReasonAwareAnime = AnimeSummary & {
  reasons?: RecommendationReason[];
};

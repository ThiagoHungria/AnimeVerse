/**
 * Pure mappers from backend DTOs to internal domain models.
 *
 * Kept dependency-free (types only) so they can be reused by the sync layer and
 * the recommendation hydration helper without pulling in stores or side effects.
 */

import type { AnimeSummaryDto } from "./apiClient";
import type { AnimeSummary } from "@/types";

/**
 * Map a slim backend AnimeSummaryDto to a full AnimeSummary.
 *
 * The backend does not store enrichment fields (smartTags/demographics/studios),
 * so those default to empty and status is "unknown". Used as the fallback when a
 * richer client-side record is not available.
 */
export function dtoToSummary(d: AnimeSummaryDto): AnimeSummary {
  return {
    id: d.id,
    malId: d.malId,
    title: d.title,
    titleEnglish: d.titleEnglish,
    description: d.description,
    image: d.image,
    banner: d.banner,
    rating: d.rating,
    genres: d.genres,
    themes: d.themes ?? [],
    demographics: [],
    smartTags: [],
    studios: [],
    status: "unknown",
    statusLabel: "Desconhecido",
    episodeCount: d.episodeCount,
    year: d.year,
    season: d.season,
    source: (d.source as AnimeSummary["source"]) ?? "jikan",
  };
}

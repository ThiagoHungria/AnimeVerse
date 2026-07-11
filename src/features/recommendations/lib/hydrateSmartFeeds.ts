/**
 * Hydrate backend SmartFeed sections into display-ready feeds.
 *
 * Each section's slim items are joined against the discovery pool by `malId`
 * (via `hydrateRecommendations`), recovering the rich card fields while
 * preserving section order, item order, reasons and the anchor `source`.
 */

import type { AnimeSummary } from "@/types";
import type { SmartFeedSectionDto } from "@/services/apiClient";
import { hydrateRecommendations } from "./hydrateRecommendations";
import type { SmartFeed } from "./recommendationSource";

export function hydrateSmartFeedSections(
  sections: SmartFeedSectionDto[],
  pool: AnimeSummary[] | undefined,
): SmartFeed[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    eyebrow: section.eyebrow,
    source: section.source,
    animes: hydrateRecommendations(section.items, pool),
  }));
}

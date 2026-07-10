import { describe, expect, it } from "vitest";
import { hydrateRecommendations } from "./hydrateRecommendations";
import type { AnimeSummaryDto, RecommendationReason } from "@/services/apiClient";
import type { AnimeSummary } from "@/types";

function poolAnime(overrides: Partial<AnimeSummary> = {}): AnimeSummary {
  return {
    id: "1",
    malId: 1,
    title: "Pool Anime",
    description: "",
    image: "pool.png",
    banner: "pool-banner.png",
    rating: 8,
    genres: ["Action"],
    themes: ["Military"],
    demographics: ["Shounen"],
    smartTags: ["Alta adrenalina"],
    studios: ["MAPPA"],
    status: "ongoing",
    statusLabel: "Em lançamento",
    episodeCount: 24,
    source: "jikan",
    ...overrides,
  };
}

function dto(overrides: Partial<AnimeSummaryDto> = {}): AnimeSummaryDto {
  return {
    id: "1",
    malId: 1,
    title: "DTO Anime",
    description: "",
    image: "dto.png",
    banner: "dto-banner.png",
    rating: 7,
    genres: ["Drama"],
    themes: [],
    episodeCount: 12,
    source: "jikan",
    ...overrides,
  };
}

const reason: RecommendationReason = {
  type: "genre_similar",
  label: "Combina com seus gêneros",
};

describe("hydrateRecommendations", () => {
  it("uses the full pool record on a malId hit (enrichment preserved)", () => {
    const [result] = hydrateRecommendations(
      [dto({ malId: 1, reasons: [reason], score: 0.9, trending: true })],
      [poolAnime({ malId: 1 })],
    );

    expect(result.smartTags).toEqual(["Alta adrenalina"]);
    expect(result.demographics).toEqual(["Shounen"]);
    expect(result.studios).toEqual(["MAPPA"]);
    expect(result.title).toBe("Pool Anime");
    expect(result.reasons).toEqual([reason]);
    expect(result.score).toBe(0.9);
    expect(result.trending).toBe(true);
  });

  it("falls back to dtoToSummary when the malId is not in the pool", () => {
    const [result] = hydrateRecommendations(
      [dto({ malId: 999, reasons: [reason] })],
      [poolAnime({ malId: 1 })],
    );

    expect(result.malId).toBe(999);
    expect(result.title).toBe("DTO Anime");
    expect(result.smartTags).toEqual([]);
    expect(result.demographics).toEqual([]);
    expect(result.studios).toEqual([]);
    expect(result.status).toBe("unknown");
    expect(result.reasons).toEqual([reason]);
  });

  it("uses the getById resolver before the dtoToSummary fallback", () => {
    const resolver = (malId: number) =>
      malId === 42 ? poolAnime({ malId: 42, title: "Resolved" }) : undefined;

    const [result] = hydrateRecommendations(
      [dto({ malId: 42 })],
      [],
      resolver,
    );

    expect(result.title).toBe("Resolved");
    expect(result.smartTags).toEqual(["Alta adrenalina"]);
  });

  it("preserves the backend ranking order", () => {
    const results = hydrateRecommendations(
      [dto({ malId: 3 }), dto({ malId: 1 }), dto({ malId: 2 })],
      [
        poolAnime({ malId: 1 }),
        poolAnime({ malId: 2 }),
        poolAnime({ malId: 3 }),
      ],
    );

    expect(results.map((r) => r.malId)).toEqual([3, 1, 2]);
  });

  it("defaults reasons to an empty array when absent", () => {
    const [result] = hydrateRecommendations([dto({ malId: 1 })], [
      poolAnime({ malId: 1 }),
    ]);
    expect(result.reasons).toEqual([]);
  });
});

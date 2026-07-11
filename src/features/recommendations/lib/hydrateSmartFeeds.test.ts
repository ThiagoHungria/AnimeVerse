import { describe, expect, it } from "vitest";
import { hydrateSmartFeedSections } from "./hydrateSmartFeeds";
import type { AnimeSummary } from "@/types";
import type { SmartFeedSectionDto } from "@/services/apiClient";

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

function section(
  id: string,
  malIds: number[],
  source?: { animeId: number; title: string },
): SmartFeedSectionDto {
  return {
    id,
    title: id,
    eyebrow: "eyebrow",
    source,
    items: malIds.map((malId) => ({
      id: String(malId),
      malId,
      title: `DTO ${malId}`,
      description: "",
      image: "dto.png",
      banner: "dto-banner.png",
      rating: 7,
      genres: ["Drama"],
      themes: [],
      episodeCount: 12,
      source: "jikan",
      reasons: [
        {
          type: "genre_similar",
          sourceAnimeId: source?.animeId,
          sourceTitle: source?.title,
          label: `Porque ${source?.title ?? "?"}`,
        },
      ],
    })),
  };
}

describe("hydrateSmartFeedSections", () => {
  const pool = [
    poolAnime({ id: "1", malId: 1, title: "Pool One" }),
    poolAnime({ id: "2", malId: 2, title: "Pool Two" }),
    poolAnime({ id: "3", malId: 3, title: "Pool Three" }),
  ];

  it("preserves section order, item order, reasons and source", () => {
    const sections = [
      section("because-watched", [3, 1], { animeId: 100, title: "Anchor A" }),
      section("like-favorite", [2], { animeId: 201, title: "Anchor B" }),
    ];

    const feeds = hydrateSmartFeedSections(sections, pool);

    // Section order preserved.
    expect(feeds.map((f) => f.id)).toEqual(["because-watched", "like-favorite"]);
    // Item order preserved and hydrated against the pool (enrichment recovered).
    expect(feeds[0].animes.map((a) => a.malId)).toEqual([3, 1]);
    expect(feeds[0].animes[0].title).toBe("Pool Three");
    expect(feeds[0].animes[0].smartTags).toEqual(["Alta adrenalina"]);
    // Source preserved per section.
    expect(feeds[0].source).toEqual({ animeId: 100, title: "Anchor A" });
    expect(feeds[1].source).toEqual({ animeId: 201, title: "Anchor B" });
    // Reasons preserved on hydrated items.
    expect(feeds[0].animes[0].reasons?.[0]).toMatchObject({
      sourceAnimeId: 100,
      label: "Porque Anchor A",
    });
  });

  it("falls back to slim records when an item is not in the pool", () => {
    const sections = [section("because-watched", [999], { animeId: 5, title: "Z" })];
    const feeds = hydrateSmartFeedSections(sections, pool);

    expect(feeds[0].animes[0].malId).toBe(999);
    expect(feeds[0].animes[0].title).toBe("DTO 999");
    expect(feeds[0].animes[0].smartTags).toEqual([]);
  });
});

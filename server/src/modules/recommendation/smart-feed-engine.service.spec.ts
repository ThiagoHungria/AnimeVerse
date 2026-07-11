/**
 * Specs for the contextual SmartFeed engine (FASE 2.2-G.2.1).
 *
 * Covers the pure `scoreAgainstAnchor` ranking + reason building and the
 * `SmartFeedEngineService` orchestration (anchor selection, empty-section
 * omission, no-history resilience) with lightweight stubs — no DB/cache/Jikan.
 */

import { describe, expect, it, vi } from "vitest";
import {
  SmartFeedEngineService,
  scoreAgainstAnchor,
  type AnchorAnime,
} from "./smart-feed-engine.service";
import type { RecommendationEngineService } from "./recommendation.service";
import type { AnimeCacheService } from "../anime/anime-cache.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { CandidateAnime } from "../../services/scoring/scoring.types";
import type {
  CachedFeeds,
  RecommendationCacheService,
} from "./recommendation-cache.service";

function candidate(overrides: Partial<CandidateAnime> = {}): CandidateAnime {
  return {
    id: 1,
    title: `Anime ${overrides.id ?? 1}`,
    genres: ["Action"],
    themes: [],
    score: 8,
    popularity: 100,
    ...overrides,
  };
}

const anchor: AnchorAnime = {
  id: 100,
  title: "Attack on Titan",
  genres: ["Action", "Drama"],
  themes: ["Military"],
};

describe("scoreAgainstAnchor (pure)", () => {
  it("ranks candidates by trait overlap with the anchor", () => {
    const ranked = scoreAgainstAnchor(anchor, [
      candidate({ id: 1, genres: ["Comedy"], themes: [], score: 9 }),
      candidate({ id: 2, genres: ["Action", "Drama"], themes: ["Military"], score: 6 }),
    ]);

    // Full-overlap candidate outranks the higher-rated no-overlap one.
    expect(ranked.map((r) => r.anime.id)).toEqual([2]);
  });

  it("attaches a contextual reason with sourceAnimeId/sourceTitle and label", () => {
    const ranked = scoreAgainstAnchor(anchor, [candidate({ id: 2, genres: ["Action"] })], {
      makeLabel: (a) => `Porque você assistiu ${a.title}`,
    });

    expect(ranked[0].reasons).toEqual([
      {
        type: "genre_similar",
        sourceAnimeId: 100,
        sourceTitle: "Attack on Titan",
        label: "Porque você assistiu Attack on Titan",
      },
    ]);
  });

  it("never recommends the anchor itself or excluded ids", () => {
    const ranked = scoreAgainstAnchor(anchor, [
      candidate({ id: 100, genres: ["Action"] }),
      candidate({ id: 5, genres: ["Action"] }),
      candidate({ id: 6, genres: ["Action"] }),
    ], { excludeIds: [5] });

    const ids = ranked.map((r) => r.anime.id);
    expect(ids).not.toContain(100);
    expect(ids).not.toContain(5);
    expect(ids).toContain(6);
  });

  it("drops zero-overlap candidates and returns [] for a trait-less anchor", () => {
    const noOverlap = scoreAgainstAnchor(anchor, [
      candidate({ id: 7, genres: ["Comedy"], themes: [] }),
    ]);
    expect(noOverlap).toEqual([]);

    const emptyAnchor = scoreAgainstAnchor(
      { id: 1, title: "Empty", genres: [], themes: [] },
      [candidate({ id: 2, genres: ["Action"] })],
    );
    expect(emptyAnchor).toEqual([]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      candidate({ id: i + 1, genres: ["Action"] }),
    );
    expect(scoreAgainstAnchor(anchor, many, { limit: 5 })).toHaveLength(5);
  });
});

// --- Service orchestration --------------------------------------------------

const animeCacheStub = {
  toResponse: (a: { id: number; title: string; genres: string[]; themes: string[]; score?: number }) => ({
    id: String(a.id),
    malId: a.id,
    title: a.title,
    genres: a.genres,
    themes: a.themes,
    rating: a.score ?? 0,
    source: "jikan" as const,
  }),
  upsertMany: vi.fn(async () => undefined),
} as unknown as AnimeCacheService;

function makeEngineStub(candidates: CandidateAnime[]): RecommendationEngineService {
  return {
    loadCandidates: vi.fn(async () => candidates),
  } as unknown as RecommendationEngineService;
}

function makePrismaStub(overrides: Record<string, unknown>): PrismaService {
  return overrides as unknown as PrismaService;
}

function makeRecoCacheStub(
  overrides: Partial<RecommendationCacheService> = {},
): RecommendationCacheService {
  return {
    getFeeds: vi.fn(async () => null),
    setFeeds: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as RecommendationCacheService;
}

function animeRow(id: number, genres: string[], themes: string[] = [], title = `Anime ${id}`) {
  return { id, title, genres, themes };
}

function makeService(
  candidates: CandidateAnime[],
  user: unknown,
  recoCache: RecommendationCacheService = makeRecoCacheStub(),
  prismaOverrides: Record<string, unknown> = {},
) {
  const engine = makeEngineStub(candidates);
  const prisma = makePrismaStub({
    user: { findUnique: vi.fn(async () => user) },
    ...prismaOverrides,
  });
  const service = new SmartFeedEngineService(
    prisma,
    engine,
    animeCacheStub,
    recoCache,
  );
  return { service, engine, prisma, recoCache };
}

describe("SmartFeedEngineService — getFeedsForUser", () => {
  const candidates = [
    candidate({ id: 1, genres: ["Action", "Drama"], themes: ["Military"] }),
    candidate({ id: 2, genres: ["Romance"], themes: [] }),
    candidate({ id: 3, genres: ["Action"], themes: [] }),
  ];

  it("builds because-watched anchored on the most recent watch", async () => {
    const user = {
      favorites: [],
      watchHistory: [{ animeId: 100, anime: animeRow(100, ["Action", "Drama"], ["Military"], "Attack on Titan") }],
    };
    const { service } = makeService(candidates, user);

    const feeds = await service.getFeedsForUser("user-1");

    const watched = feeds.find((f) => f.id === "because-watched");
    expect(watched).toBeDefined();
    expect(watched?.source).toEqual({ animeId: 100, title: "Attack on Titan" });
    // Reasons point back to the anchor.
    expect(watched?.items[0].reasons?.[0]).toMatchObject({
      sourceAnimeId: 100,
      sourceTitle: "Attack on Titan",
      label: "Porque você assistiu Attack on Titan",
    });
  });

  it("picks the favorite anchor that yields the richest section (max 3)", async () => {
    const user = {
      // First favorite overlaps nothing useful; second overlaps two candidates.
      favorites: [
        { animeId: 200, anime: animeRow(200, ["Sports"]) },
        { animeId: 201, anime: animeRow(201, ["Action"], [], "Best Anchor") },
        { animeId: 202, anime: animeRow(202, ["Mystery"]) },
      ],
      watchHistory: [],
    };
    const { service } = makeService(candidates, user);

    const feeds = await service.getFeedsForUser("user-1");

    const favorite = feeds.find((f) => f.id === "like-favorite");
    expect(favorite?.source.animeId).toBe(201);
    expect(favorite?.items.every((i) =>
      i.reasons?.some((r) => r.sourceAnimeId === 201),
    )).toBe(true);
  });

  it("omits sections that would be empty", async () => {
    const user = {
      // Only a favorite that overlaps nothing → like-favorite omitted too.
      favorites: [{ animeId: 300, anime: animeRow(300, ["Slice of Life"]) }],
      watchHistory: [],
    };
    const { service } = makeService(candidates, user);

    const feeds = await service.getFeedsForUser("user-1");
    expect(feeds).toEqual([]);
  });

  it("does not break for a user with no history and no favorites", async () => {
    const { service } = makeService(candidates, {
      favorites: [],
      watchHistory: [],
    });
    await expect(service.getFeedsForUser("user-1")).resolves.toEqual([]);
  });

  it("returns [] when the candidate pool is unavailable", async () => {
    const user = {
      favorites: [],
      watchHistory: [{ animeId: 100, anime: animeRow(100, ["Action"]) }],
    };
    const { service } = makeService([], user);
    await expect(service.getFeedsForUser("user-1")).resolves.toEqual([]);
  });

  it("excludes already-seen anime from the sections", async () => {
    const user = {
      favorites: [{ animeId: 3, anime: animeRow(3, ["Action"]) }],
      watchHistory: [{ animeId: 100, anime: animeRow(100, ["Action", "Drama"], ["Military"], "Anchor") }],
    };
    const { service } = makeService(candidates, user);

    const feeds = await service.getFeedsForUser("user-1");
    const watched = feeds.find((f) => f.id === "because-watched");
    // Candidate 3 is a favorite (seen) and must not appear.
    expect(watched?.items.map((i) => i.malId)).not.toContain(3);
  });

  it("persists computed sections to the feeds cache on a miss", async () => {
    const user = {
      favorites: [],
      watchHistory: [{ animeId: 100, anime: animeRow(100, ["Action", "Drama"], ["Military"], "Anchor") }],
    };
    const recoCache = makeRecoCacheStub();
    const { service } = makeService(candidates, user, recoCache);

    await service.getFeedsForUser("user-1");

    expect(recoCache.setFeeds).toHaveBeenCalledTimes(1);
    const [userIdArg, payload] = (recoCache.setFeeds as unknown as {
      mock: { calls: [string, CachedFeeds][] };
    }).mock.calls[0];
    expect(userIdArg).toBe("user-1");
    const cachedSection = payload.sections[0];
    expect(cachedSection.id).toBe("because-watched");
    expect(cachedSection.source).toEqual({ animeId: 100, title: "Anchor" });
    expect(cachedSection.ids.length).toBeGreaterThan(0);
  });

  it("does not persist an empty result", async () => {
    const recoCache = makeRecoCacheStub();
    const { service } = makeService(
      candidates,
      { favorites: [], watchHistory: [] },
      recoCache,
    );

    await service.getFeedsForUser("user-1");
    expect(recoCache.setFeeds).not.toHaveBeenCalled();
  });
});

describe("SmartFeedEngineService — cache hit reconstruction", () => {
  function dbRow(
    id: number,
    genres: string[],
    themes: string[] = [],
    title = `Anime ${id}`,
  ) {
    return {
      id,
      title,
      titleEnglish: null,
      synopsis: null,
      image: null,
      banner: null,
      score: 8,
      rank: null,
      popularity: null,
      genres,
      themes,
      status: null,
      episodes: 12,
      year: null,
      season: null,
      type: null,
    };
  }

  const cached: CachedFeeds = {
    sections: [
      {
        id: "because-watched",
        title: "Porque você assistiu Anchor A",
        eyebrow: "Continuidade de gosto",
        source: { animeId: 100, title: "Anchor A" },
        ids: [3, 1],
        reasons: {
          3: [
            {
              type: "genre_similar",
              sourceAnimeId: 100,
              sourceTitle: "Anchor A",
              label: "Porque você assistiu Anchor A",
            },
          ],
        },
        scores: { 3: 0.8, 1: 0.6 },
        trending: { 3: true },
      },
      {
        id: "like-favorite",
        title: "Parecido com Anchor B",
        eyebrow: "Mesma vibe",
        source: { animeId: 201, title: "Anchor B" },
        ids: [2],
        reasons: {},
        scores: {},
        trending: {},
      },
    ],
  };

  it("rebuilds from cache preserving section order, item order, reasons and source", async () => {
    const recoCache = makeRecoCacheStub({
      getFeeds: vi.fn(async () => cached),
    });
    const { service, engine } = makeService(
      [],
      undefined,
      recoCache,
      {
        anime: {
          findMany: vi.fn(async () => [
            dbRow(1, ["Action"]),
            dbRow(2, ["Romance"]),
            dbRow(3, ["Action", "Drama"]),
          ]),
        },
      },
    );

    const feeds = await service.getFeedsForUser("user-1");

    // Section order preserved.
    expect(feeds.map((f) => f.id)).toEqual(["because-watched", "like-favorite"]);
    // Item order preserved (3 before 1, matching cached ids).
    expect(feeds[0].items.map((i) => i.malId)).toEqual([3, 1]);
    // Reasons + score + trending preserved.
    expect(feeds[0].items[0].reasons[0]).toMatchObject({
      sourceAnimeId: 100,
      label: "Porque você assistiu Anchor A",
    });
    expect(feeds[0].items[0].score).toBe(0.8);
    expect(feeds[0].items[0].trending).toBe(true);
    // Source preserved per section.
    expect(feeds[0].source).toEqual({ animeId: 100, title: "Anchor A" });
    expect(feeds[1].source).toEqual({ animeId: 201, title: "Anchor B" });
    // A hit must not recompute (no candidate pool access).
    expect(engine.loadCandidates).not.toHaveBeenCalled();
  });

  it("recomputes when the cached rows can no longer be resolved", async () => {
    const recoCache = makeRecoCacheStub({
      getFeeds: vi.fn(async () => cached),
    });
    const { service, engine } = makeService(
      [],
      { favorites: [], watchHistory: [] },
      recoCache,
      { anime: { findMany: vi.fn(async () => []) } },
    );

    const feeds = await service.getFeedsForUser("user-1");

    // Reconstruction yielded nothing → fell through to recompute (empty user).
    expect(feeds).toEqual([]);
    expect(engine.loadCandidates).toHaveBeenCalled();
  });
});

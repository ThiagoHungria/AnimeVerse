/**
 * Integration specs for RecommendationEngineService ↔ RecommendationScoringService
 * (FASE 2.2-B3/B4).
 *
 * These exercise the integration seams (`buildUserSignals`, `rankCandidates`,
 * `loadCandidates`, cache-hit path) with the real scoring engine and lightweight
 * stubs for the I/O collaborators. No real DB, cache or Jikan calls are made.
 */

import { describe, expect, it, vi } from "vitest";
import {
  RecommendationEngineService,
  TASTE_SCORING_WEIGHTS,
} from "./recommendation.service";
import type { RecommendationUserData } from "./recommendation.service";
import { RecommendationScoringService } from "../../services/scoring/recommendation-scoring.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import type { CachedReco } from "./recommendation-cache.service";
import type { AnimeCacheService } from "../anime/anime-cache.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { CandidateAnime } from "../../services/scoring/scoring.types";
import { jikanClient } from "../../services/jikan.service";

/** A stubbed anime-cache whose toResponse mirrors the real (pure) mapping. */
const animeCacheStub = {
  toResponse: (anime: CandidateAnime) => ({
    id: String(anime.id),
    malId: anime.id,
    title: anime.title,
    genres: anime.genres,
    themes: anime.themes,
    rating: anime.score ?? 0,
    source: "jikan" as const,
  }),
  upsertMany: vi.fn(async () => undefined),
} as unknown as AnimeCacheService;

function makeRecoCacheStub(
  overrides: Partial<RecommendationCacheService> = {},
): RecommendationCacheService {
  return {
    getUser: vi.fn(async () => null),
    setUser: vi.fn(async () => undefined),
    getTaste: vi.fn(async () => null),
    setTaste: vi.fn(async () => undefined),
    invalidateUser: vi.fn(async () => undefined),
    getPool: vi.fn(async () => null),
    setPool: vi.fn(async () => undefined),
    getTrending: vi.fn(async () => null),
    setTrending: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as RecommendationCacheService;
}

function makeEngine(
  scoring = new RecommendationScoringService(),
  recoCache = makeRecoCacheStub(),
  prisma = {} as PrismaService,
) {
  const engine = new RecommendationEngineService(
    prisma,
    recoCache,
    animeCacheStub,
    scoring,
  );
  return { engine, scoring, recoCache };
}

function makeUser(
  overrides: Partial<RecommendationUserData> = {},
): RecommendationUserData {
  return {
    preferences: null,
    favorites: [],
    watchHistory: [],
    ratings: [],
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<CandidateAnime> = {}): CandidateAnime {
  return {
    id: 1,
    title: "Test Anime",
    genres: ["Action"],
    themes: [],
    score: 8,
    popularity: 100,
    ...overrides,
  };
}

describe("RecommendationEngineService — buildUserSignals", () => {
  it("builds rich signals from a user with history and favorites", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(
      makeUser({
        preferences: {
          preferredGenres: ["Action"],
          genreScores: { Action: 2 },
        },
        favorites: [{ animeId: 10, anime: { genres: ["Action", "Adventure"] } }],
        watchHistory: [
          {
            animeId: 20,
            progress: 24,
            duration: 24,
            updatedAt: new Date(),
            anime: { genres: ["Action"], themes: ["Military"] },
          },
        ],
        ratings: [{ animeId: 30, score: 9 }],
      }),
    );

    expect(signals.tasteProfile.Action).toBeGreaterThan(0);
    expect(signals.history).toHaveLength(1);
    expect(signals.history[0]).toMatchObject({
      animeId: 20,
      genres: ["Action"],
      themes: ["Military"],
      progress: 24,
      duration: 24,
    });
    expect(signals.favoriteGenres).toContain("Adventure");
    expect(signals.ratings).toEqual({ 30: 9 });
    expect(signals.seenAnimeIds).toEqual(expect.arrayContaining([10, 20]));
  });

  it("produces cold-start (empty) signals for a user with no data", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(makeUser());

    expect(signals.tasteProfile).toEqual({});
    expect(signals.history).toEqual([]);
    expect(signals.favoriteGenres).toEqual([]);
    expect(signals.seenAnimeIds).toEqual([]);
    expect(signals.ratings).toEqual({});
  });
});

describe("RecommendationEngineService — rankCandidates", () => {
  it("calls the scoring service with the given signals and candidates", () => {
    const { engine, scoring } = makeEngine();
    const spy = vi.spyOn(scoring, "score");

    const signals = engine.buildUserSignals(makeUser());
    const candidates = [makeCandidate({ id: 1 }), makeCandidate({ id: 2 })];
    engine.rankCandidates(signals, candidates, { limit: 5 });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      signals,
      candidates,
      expect.objectContaining({ limit: 5 }),
    );
  });

  it("excludes anime the user has already seen", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(
      makeUser({
        favorites: [{ animeId: 1, anime: { genres: ["Action"] } }],
      }),
    );

    const { response, ids } = engine.rankCandidates(signals, [
      makeCandidate({ id: 1 }),
      makeCandidate({ id: 2 }),
    ]);

    expect(ids).not.toContain(1);
    expect(response.map((r) => r.malId)).toEqual([2]);
  });

  it("preserves reasons on the response and in the reasons map", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(
      makeUser({
        preferences: { preferredGenres: ["Action"], genreScores: {} },
      }),
    );

    const { response, reasonsByAnime } = engine.rankCandidates(signals, [
      makeCandidate({ id: 1, genres: ["Action"] }),
    ]);

    expect(response[0].reasons.length).toBeGreaterThan(0);
    expect(response[0].reasons[0]).toHaveProperty("type");
    expect(response[0].reasons[0]).toHaveProperty("label");
    expect(reasonsByAnime[1]).toEqual(response[0].reasons);
    // The proxy must never surface a collaborative reason yet.
    expect(response[0].reasons.some((r) => r.type === "similar_users")).toBe(
      false,
    );
  });

  it("cold-start users still receive ranked recommendations", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(makeUser());

    const { response } = engine.rankCandidates(signals, [
      makeCandidate({ id: 1, score: 5, popularity: 5000 }),
      makeCandidate({ id: 2, score: 9, popularity: 10 }),
    ]);

    expect(response).toHaveLength(2);
    expect(response[0].malId).toBe(2);
  });

  it("attaches a numeric score to each recommendation", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(makeUser());

    const { response, scoreByAnime } = engine.rankCandidates(signals, [
      makeCandidate({ id: 1, score: 9, popularity: 10 }),
    ]);

    expect(typeof response[0].score).toBe("number");
    expect(response[0].score).toBeGreaterThanOrEqual(0);
    expect(response[0].score).toBeLessThanOrEqual(1);
    expect(scoreByAnime[1]).toBe(response[0].score);
  });

  it("attaches the trending flag from the candidate", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(makeUser());

    const { response, trendingByAnime } = engine.rankCandidates(signals, [
      makeCandidate({ id: 1, trending: true }),
      makeCandidate({ id: 2, trending: false }),
    ]);

    const byId = new Map(response.map((r) => [r.malId, r]));
    expect(byId.get(1)?.trending).toBe(true);
    expect(byId.get(2)?.trending).toBe(false);
    expect(trendingByAnime[1]).toBe(true);
    expect(trendingByAnime[2]).toBe(false);
  });
});

describe("RecommendationEngineService — candidate cache", () => {
  it("uses cached pool/trending without calling Jikan", async () => {
    const poolSpy = vi.spyOn(jikanClient, "getPool");
    const trendingSpy = vi.spyOn(jikanClient, "getTrending");
    try {
      const recoCache = makeRecoCacheStub({
        getPool: vi.fn(async () => [makeCandidate({ id: 1 })]),
        getTrending: vi.fn(async () => [makeCandidate({ id: 2 })]),
      });
      const { engine } = makeEngine(new RecommendationScoringService(), recoCache);

      const candidates = await engine.loadCandidates();

      expect(poolSpy).not.toHaveBeenCalled();
      expect(trendingSpy).not.toHaveBeenCalled();
      expect(candidates.map((c) => c.id).sort()).toEqual([1, 2]);
      // The trending id must carry the trending flag.
      expect(candidates.find((c) => c.id === 2)?.trending).toBe(true);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });

  it("fetches from Jikan and populates the cache on a miss", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockResolvedValue([makeCandidate({ id: 1 })]);
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockResolvedValue([makeCandidate({ id: 2 })]);
    try {
      const recoCache = makeRecoCacheStub();
      const { engine } = makeEngine(new RecommendationScoringService(), recoCache);

      await engine.loadCandidates();

      expect(poolSpy).toHaveBeenCalledTimes(1);
      expect(trendingSpy).toHaveBeenCalledTimes(1);
      expect(recoCache.setPool).toHaveBeenCalledTimes(1);
      expect(recoCache.setTrending).toHaveBeenCalledTimes(1);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });
});

describe("RecommendationEngineService — candidate resilience (FASE 2.2-F.2)", () => {
  it("degrades to empty candidates when both Jikan sources fail (no throw)", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 400: /top/anime?limit=25&sfw=true"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockRejectedValue(new Error("Jikan 500: /top/anime?filter=airing"));
    try {
      const { engine } = makeEngine();
      await expect(engine.loadCandidates()).resolves.toEqual([]);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });

  it("still returns partial candidates when only trending succeeds", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 400"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockResolvedValue([makeCandidate({ id: 9 })]);
    try {
      const { engine } = makeEngine();
      const candidates = await engine.loadCandidates();

      expect(candidates.map((c) => c.id)).toEqual([9]);
      expect(candidates[0].trending).toBe(true);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });
});

describe("RecommendationEngineService — durable pool fallback (FASE 2.2-K)", () => {
  function poolRow(id: number, genres = ["Action"]) {
    return {
      id,
      title: `Durable ${id}`,
      titleEnglish: null,
      synopsis: null,
      image: "poster.png",
      banner: null,
      score: 8,
      rank: null,
      popularity: 100,
      genres,
      themes: [],
      status: null,
      episodes: 12,
      year: null,
      season: null,
      type: null,
    };
  }

  it("falls back to the persisted Anime pool when cache is cold and Jikan fails", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 504: /top/anime"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockRejectedValue(new Error("Jikan 504: /top/anime?filter=airing"));
    try {
      const findMany = vi.fn(async () => [poolRow(1), poolRow(2, ["Romance"])]);
      const prisma = { anime: { findMany } } as unknown as PrismaService;
      const { engine } = makeEngine(
        new RecommendationScoringService(),
        makeRecoCacheStub(),
        prisma,
      );

      const candidates = await engine.loadCandidates();

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(candidates.map((c) => c.id).sort()).toEqual([1, 2]);
      // The persisted row's metadata survives the DB → external mapping.
      expect(candidates.find((c) => c.id === 2)?.genres).toEqual(["Romance"]);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });

  it("does not touch the DB when the cache/Jikan already provides a pool", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockResolvedValue([makeCandidate({ id: 1 })]);
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockResolvedValue([]);
    try {
      const findMany = vi.fn(async () => [] as ReturnType<typeof poolRow>[]);
      const prisma = { anime: { findMany } } as unknown as PrismaService;
      const { engine } = makeEngine(
        new RecommendationScoringService(),
        makeRecoCacheStub(),
        prisma,
      );

      await engine.loadCandidates();

      expect(findMany).not.toHaveBeenCalled();
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });

  it("returns [] when Jikan fails and the durable pool is also empty", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 504"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockRejectedValue(new Error("Jikan 504"));
    try {
      const prisma = {
        anime: { findMany: vi.fn(async () => []) },
      } as unknown as PrismaService;
      const { engine } = makeEngine(
        new RecommendationScoringService(),
        makeRecoCacheStub(),
        prisma,
      );

      await expect(engine.loadCandidates()).resolves.toEqual([]);
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });
});

describe("RecommendationEngineService — empty candidates (FASE 2.2-F.2)", () => {
  it("scoring yields an empty ranking for an empty candidate set", () => {
    const { engine } = makeEngine();
    const signals = engine.buildUserSignals(makeUser());

    const { response, ids } = engine.rankCandidates(signals, []);

    expect(response).toEqual([]);
    expect(ids).toEqual([]);
  });

  it("getForUser returns [] and persists nothing when candidates degrade", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 400"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockRejectedValue(new Error("Jikan 400"));
    try {
      const prisma = {
        user: { findUnique: vi.fn(async () => makeUser()) },
        recommendationCache: { create: vi.fn(async () => ({})) },
      } as unknown as PrismaService;
      const recoCache = makeRecoCacheStub();
      const { engine } = makeEngine(
        new RecommendationScoringService(),
        recoCache,
        prisma,
      );

      const result = await engine.getForUser("user-1");

      expect(result).toEqual([]);
      // No empty cache is persisted, so the next request retries upstream.
      expect(prisma.recommendationCache.create).not.toHaveBeenCalled();
      expect(recoCache.setUser).not.toHaveBeenCalled();
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });
});

describe("RecommendationEngineService — cache hit", () => {
  function cachedAnimeRow(id: number, title = "Cached Anime") {
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
      genres: ["Action"],
      themes: [],
      status: null,
      episodes: 12,
      year: null,
      season: null,
      type: null,
    };
  }

  it("preserves reasons, score and trending stored in the user cache", async () => {
    const cached: CachedReco = {
      ids: [1],
      reasons: {
        1: [{ type: "genre_similar", label: "Combina com seus gêneros" }],
      },
      scores: { 1: 0.77 },
      trending: { 1: true },
    };
    const prisma = {
      anime: { findMany: vi.fn(async () => [cachedAnimeRow(1)]) },
    } as unknown as PrismaService;

    const recoCache = makeRecoCacheStub({ getUser: vi.fn(async () => cached) });
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    const result = await engine.getForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toEqual(cached.reasons[1]);
    expect(result[0].score).toBe(0.77);
    expect(result[0].trending).toBe(true);
  });

  it("preserves the cached ranking order", async () => {
    const cached: CachedReco = {
      ids: [3, 1, 2],
      reasons: {},
      scores: {},
      trending: {},
    };
    // findMany returns DB order (1,2,3), not the ranking order.
    const prisma = {
      anime: {
        findMany: vi.fn(async () => [
          cachedAnimeRow(1),
          cachedAnimeRow(2),
          cachedAnimeRow(3),
        ]),
      },
    } as unknown as PrismaService;

    const recoCache = makeRecoCacheStub({ getUser: vi.fn(async () => cached) });
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    const result = await engine.getForUser("user-1");
    expect(result.map((r) => r.malId)).toEqual([3, 1, 2]);
  });

  it("stays backward compatible with a legacy cache lacking score/trending", async () => {
    // A legacy id-only entry, as normalized by the cache service.
    const cached: CachedReco = {
      ids: [1],
      reasons: {},
      scores: {},
      trending: {},
    };
    const prisma = {
      anime: { findMany: vi.fn(async () => [cachedAnimeRow(1)]) },
    } as unknown as PrismaService;

    const recoCache = makeRecoCacheStub({ getUser: vi.fn(async () => cached) });
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    const result = await engine.getForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toEqual([]);
    expect(result[0].score).toBeUndefined();
    expect(result[0].trending).toBeUndefined();
  });
});

describe("RecommendationEngineService — getTasteForUser (FASE 2.2-G.1)", () => {
  function tasteRow(id: number) {
    return {
      id,
      title: `Taste ${id}`,
      titleEnglish: null,
      synopsis: null,
      image: null,
      banner: null,
      score: 8,
      rank: null,
      popularity: null,
      genres: ["Romance"],
      themes: [],
      status: null,
      episodes: 12,
      year: null,
      season: null,
      type: null,
    };
  }

  it("blends with genre-heavy weights: taste genre outranks higher quality", async () => {
    const recoCache = makeRecoCacheStub({
      getTaste: vi.fn(async () => null),
      getTrending: vi.fn(async () => []),
      getPool: vi.fn(async () => [
        makeCandidate({ id: 1, genres: ["Action"], score: 9, popularity: 10 }),
        makeCandidate({ id: 2, genres: ["Romance"], score: 5, popularity: 5000 }),
      ]),
    });
    const prisma = {
      user: {
        findUnique: vi.fn(async () =>
          makeUser({
            preferences: {
              preferredGenres: ["Romance"],
              genreScores: { Romance: 3 },
            },
          }),
        ),
      },
    } as unknown as PrismaService;
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    const result = await engine.getTasteForUser("user-1");

    // Romance matches the user's taste and wins despite the lower MAL score.
    expect(result[0].malId).toBe(2);
  });

  it("passes the taste weights to the scoring engine", async () => {
    const scoring = new RecommendationScoringService();
    const spy = vi.spyOn(scoring, "score");
    const recoCache = makeRecoCacheStub({
      getTaste: vi.fn(async () => null),
      getTrending: vi.fn(async () => []),
      getPool: vi.fn(async () => [makeCandidate({ id: 1 })]),
    });
    const prisma = {
      user: { findUnique: vi.fn(async () => makeUser()) },
    } as unknown as PrismaService;
    const { engine } = makeEngine(scoring, recoCache, prisma);

    await engine.getTasteForUser("user-1");

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ weights: TASTE_SCORING_WEIGHTS }),
    );
  });

  it("returns the cached taste ranking without recomputing (cache hit)", async () => {
    const cached: CachedReco = {
      ids: [5],
      reasons: { 5: [{ type: "genre_similar", label: "Combina com seu gosto" }] },
      scores: { 5: 0.91 },
      trending: { 5: false },
    };
    const recoCache = makeRecoCacheStub({
      getTaste: vi.fn(async () => cached),
    });
    const prisma = {
      anime: { findMany: vi.fn(async () => [tasteRow(5)]) },
    } as unknown as PrismaService;
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    const result = await engine.getTasteForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].malId).toBe(5);
    expect(result[0].score).toBe(0.91);
    expect(result[0].reasons).toEqual(cached.reasons[5]);
    // A hit must not touch the candidate pool.
    expect(recoCache.getPool).not.toHaveBeenCalled();
  });

  it("computes and persists to the taste cache on a miss", async () => {
    const recoCache = makeRecoCacheStub({
      getTaste: vi.fn(async () => null),
      getTrending: vi.fn(async () => []),
      getPool: vi.fn(async () => [makeCandidate({ id: 7 })]),
    });
    const prisma = {
      user: { findUnique: vi.fn(async () => makeUser()) },
    } as unknown as PrismaService;
    const { engine } = makeEngine(
      new RecommendationScoringService(),
      recoCache,
      prisma,
    );

    await engine.getTasteForUser("user-1");

    expect(recoCache.setTaste).toHaveBeenCalledTimes(1);
    const [userIdArg, payload] = (recoCache.setTaste as unknown as {
      mock: { calls: [string, CachedReco][] };
    }).mock.calls[0];
    expect(userIdArg).toBe("user-1");
    expect(payload.ids).toContain(7);
  });

  it("returns [] and persists nothing when candidates degrade", async () => {
    const poolSpy = vi
      .spyOn(jikanClient, "getPool")
      .mockRejectedValue(new Error("Jikan 400"));
    const trendingSpy = vi
      .spyOn(jikanClient, "getTrending")
      .mockRejectedValue(new Error("Jikan 400"));
    try {
      const recoCache = makeRecoCacheStub({ getTaste: vi.fn(async () => null) });
      const prisma = {
        user: { findUnique: vi.fn(async () => makeUser()) },
      } as unknown as PrismaService;
      const { engine } = makeEngine(
        new RecommendationScoringService(),
        recoCache,
        prisma,
      );

      const result = await engine.getTasteForUser("user-1");

      expect(result).toEqual([]);
      expect(recoCache.setTaste).not.toHaveBeenCalled();
    } finally {
      poolSpy.mockRestore();
      trendingSpy.mockRestore();
    }
  });
});

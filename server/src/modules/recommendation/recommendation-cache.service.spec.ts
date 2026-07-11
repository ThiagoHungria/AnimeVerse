/**
 * Specs for RecommendationCacheService and the invalidation wiring (FASE 2.2-B4).
 *
 * Uses the real CacheService with its in-memory fallback (no Redis needed) to
 * verify key handling, TTLs and legacy-entry normalization, plus spies to assert
 * favorites/history mutations invalidate the per-user cache.
 */

import { describe, expect, it, vi } from "vitest";
import { RecommendationCacheService } from "./recommendation-cache.service";
import { CacheService } from "../../common/cache/cache.service";
import type { ConfigService } from "@nestjs/config";
import type { ExternalAnimeDto } from "../../services/jikan.service";
import { FavoritesService } from "../favorites/favorites.service";
import { HistoryService } from "../history/history.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { AnimeCacheService } from "../anime/anime-cache.service";

/** In-memory CacheService (REDIS_URL undefined → memory Map fallback). */
function makeMemoryCache(): CacheService {
  const config = { get: () => undefined } as unknown as ConfigService;
  return new CacheService(config);
}

function anime(id: number): ExternalAnimeDto {
  return { id, title: `Anime ${id}`, genres: [], themes: [] };
}

describe("RecommendationCacheService", () => {
  it("stores and retrieves a user payload with reasons, score and trending", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    await svc.setUser("u1", {
      ids: [1, 2],
      reasons: { 1: [{ type: "trending", label: "Em alta" }] },
      scores: { 1: 0.9 },
      trending: { 1: true },
    });

    const hit = await svc.getUser("u1");
    expect(hit?.ids).toEqual([1, 2]);
    expect(hit?.reasons[1][0].label).toBe("Em alta");
    expect(hit?.scores?.[1]).toBe(0.9);
    expect(hit?.trending?.[1]).toBe(true);
  });

  it("normalizes legacy id-only cache entries with empty metadata maps", async () => {
    const cache = makeMemoryCache();
    // Simulate a pre-2.2-B3 entry: a bare number[] under the user key.
    await cache.set(RecommendationCacheService.KEYS.user("u2"), [7, 8, 9], 60);

    const svc = new RecommendationCacheService(cache);
    const hit = await svc.getUser("u2");
    expect(hit).toEqual({
      ids: [7, 8, 9],
      reasons: {},
      scores: {},
      trending: {},
    });
  });

  it("normalizes a legacy payload without score/trending maps", async () => {
    const cache = makeMemoryCache();
    // Pre-2.2-E entry: had ids + reasons but no scores/trending.
    await cache.set(
      RecommendationCacheService.KEYS.user("u4"),
      { ids: [1], reasons: { 1: [{ type: "trending", label: "Em alta" }] } },
      60,
    );

    const svc = new RecommendationCacheService(cache);
    const hit = await svc.getUser("u4");
    expect(hit?.scores).toEqual({});
    expect(hit?.trending).toEqual({});
    expect(hit?.reasons[1][0].label).toBe("Em alta");
  });

  it("invalidates a user's cache", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    await svc.setUser("u3", { ids: [1], reasons: {} });
    expect(await svc.getUser("u3")).not.toBeNull();

    await svc.invalidateUser("u3");
    expect(await svc.getUser("u3")).toBeNull();
  });

  it("stores and retrieves a taste payload under its own key", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    await svc.setTaste("u5", {
      ids: [10, 11],
      reasons: { 10: [{ type: "genre_similar", label: "Seu gosto" }] },
      scores: { 10: 0.8 },
      trending: {},
    });

    const hit = await svc.getTaste("u5");
    expect(hit?.ids).toEqual([10, 11]);
    expect(hit?.reasons[10][0].label).toBe("Seu gosto");
    // Taste and default feeds use distinct keys — no cross-contamination.
    expect(await svc.getUser("u5")).toBeNull();
  });

  it("stores and retrieves a SmartFeeds payload with ordered sections", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    await svc.setFeeds("u7", {
      sections: [
        {
          id: "because-watched",
          title: "Porque você assistiu X",
          eyebrow: "Continuidade de gosto",
          source: { animeId: 100, title: "X" },
          ids: [3, 1],
          reasons: { 3: [{ type: "genre_similar", label: "Porque X" }] },
          scores: { 3: 0.8 },
          trending: { 3: true },
        },
      ],
    });

    const hit = await svc.getFeeds("u7");
    expect(hit?.sections).toHaveLength(1);
    expect(hit?.sections[0].id).toBe("because-watched");
    expect(hit?.sections[0].ids).toEqual([3, 1]);
    expect(hit?.sections[0].source).toEqual({ animeId: 100, title: "X" });
    expect(hit?.sections[0].reasons[3][0].label).toBe("Porque X");
  });

  it("returns null for a malformed feeds entry", async () => {
    const cache = makeMemoryCache();
    await cache.set(RecommendationCacheService.KEYS.feeds("u8"), { foo: 1 }, 60);
    const svc = new RecommendationCacheService(cache);
    expect(await svc.getFeeds("u8")).toBeNull();
  });

  it("invalidation clears the default, taste and feeds caches for a user", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    await svc.setUser("u6", { ids: [1], reasons: {} });
    await svc.setTaste("u6", { ids: [2], reasons: {} });
    await svc.setFeeds("u6", {
      sections: [
        {
          id: "like-favorite",
          title: "Parecido com Y",
          eyebrow: "Mesma vibe",
          source: { animeId: 5, title: "Y" },
          ids: [9],
          reasons: {},
        },
      ],
    });

    await svc.invalidateUser("u6");

    expect(await svc.getUser("u6")).toBeNull();
    expect(await svc.getTaste("u6")).toBeNull();
    expect(await svc.getFeeds("u6")).toBeNull();
  });

  it("caches pool and trending candidates", async () => {
    const svc = new RecommendationCacheService(makeMemoryCache());
    expect(await svc.getPool()).toBeNull();

    await svc.setPool([anime(1), anime(2)]);
    await svc.setTrending([anime(3)]);

    expect((await svc.getPool())?.map((a) => a.id)).toEqual([1, 2]);
    expect((await svc.getTrending())?.map((a) => a.id)).toEqual([3]);
  });

  it("exposes sane, ordered TTLs", () => {
    const { TTL } = RecommendationCacheService;
    expect(TTL.userColdStart).toBeLessThan(TTL.user);
    expect(TTL.user).toBeLessThanOrEqual(TTL.trending);
    expect(TTL.trending).toBeLessThanOrEqual(TTL.pool);
  });
});

describe("Recommendation cache invalidation wiring", () => {
  function favoritesSetup() {
    const recoCache = {
      invalidateUser: vi.fn(async () => undefined),
    } as unknown as RecommendationCacheService;
    const prisma = {
      anime: { findUnique: vi.fn(async () => ({ id: 1 })) },
      favorite: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "f1", animeId: 1 })),
        delete: vi.fn(async () => ({ id: "f1" })),
      },
    } as unknown as PrismaService;
    const animeCache = {} as AnimeCacheService;
    const service = new FavoritesService(prisma, animeCache, recoCache);
    return { service, recoCache, prisma };
  }

  it("invalidates recommendations when a favorite is added", async () => {
    const { service, recoCache } = favoritesSetup();
    await service.add("user-1", 1);
    expect(recoCache.invalidateUser).toHaveBeenCalledWith("user-1");
  });

  it("invalidates recommendations when a favorite is removed", async () => {
    const recoCache = {
      invalidateUser: vi.fn(async () => undefined),
    } as unknown as RecommendationCacheService;
    const prisma = {
      favorite: {
        findUnique: vi.fn(async () => ({ id: "f1", animeId: 1 })),
        delete: vi.fn(async () => ({ id: "f1" })),
      },
    } as unknown as PrismaService;
    const service = new FavoritesService(
      prisma,
      {} as AnimeCacheService,
      recoCache,
    );

    await service.remove("user-1", 1);
    expect(recoCache.invalidateUser).toHaveBeenCalledWith("user-1");
  });

  it("invalidates recommendations when history is recorded", async () => {
    const recoCache = {
      invalidateUser: vi.fn(async () => undefined),
    } as unknown as RecommendationCacheService;
    const prisma = {
      anime: { findUnique: vi.fn(async () => ({ id: 1 })) },
      watchHistory: {
        upsert: vi.fn(async () => ({ id: "h1", animeId: 1 })),
      },
      userPreferences: { upsert: vi.fn(async () => ({})) },
    } as unknown as PrismaService;
    const service = new HistoryService(
      prisma,
      {} as AnimeCacheService,
      recoCache,
    );

    await service.record("user-1", {
      animeId: 1,
      episodeId: "ep1",
      episodeNumber: 1,
      episodeTitle: "Pilot",
      progress: 120,
      duration: 1400,
    });
    expect(recoCache.invalidateUser).toHaveBeenCalledWith("user-1");
  });
});

import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import type { ExternalAnimeDto } from "../../services/jikan.service";
import type { RecommendationReason } from "./dto/recommendation.dto";

/**
 * Cached per-user recommendation payload: the ranked ids plus the metadata
 * (reasons, score, trending) keyed by MAL id, so a cache hit stays explainable
 * and complete without recomputing the scoring.
 *
 * `scores`/`trending` are additive; legacy entries without them normalize to
 * empty maps so a hit resolves those fields to undefined instead of breaking.
 */
export interface CachedReco {
  ids: number[];
  reasons: Record<number, RecommendationReason[]>;
  scores?: Record<number, number>;
  trending?: Record<number, boolean>;
}

/**
 * Centralizes recommendation-related caching: key names, TTLs, the per-user
 * result cache and the shared candidate caches (pool + trending) that shield the
 * Jikan API from repeated calls.
 *
 * All reads are defensive: legacy id-only entries (pre-2.2-B3) are normalized so
 * old cache values never break a hit.
 */
@Injectable()
export class RecommendationCacheService {
  /** Cache keys. `pool`/`trending` are global; `user` is per user. */
  static readonly KEYS = {
    user: (userId: string): string => `reco:${userId}`,
    pool: "reco:pool",
    trending: "anime:trending",
  } as const;

  /** TTLs in seconds. */
  static readonly TTL = {
    /** Personalized result — matches the DB RecommendationCache expiry. */
    user: 30 * 60, // 30 min
    /** Cold-start result — refresh sooner as the user gains signals. */
    userColdStart: 10 * 60, // 10 min
    /** Global top/popular pool — changes slowly. */
    pool: 6 * 60 * 60, // 6 h
    /** Airing trending — changes a bit faster than the pool. */
    trending: 3 * 60 * 60, // 3 h
  } as const;

  constructor(private readonly cache: CacheService) {}

  // --- Per-user result cache ----------------------------------------------

  async getUser(userId: string): Promise<CachedReco | null> {
    const raw = await this.cache.get<CachedReco | number[]>(
      RecommendationCacheService.KEYS.user(userId),
    );
    return this.normalize(raw);
  }

  async setUser(
    userId: string,
    payload: CachedReco,
    ttlSeconds: number = RecommendationCacheService.TTL.user,
  ): Promise<void> {
    await this.cache.set(
      RecommendationCacheService.KEYS.user(userId),
      payload,
      ttlSeconds,
    );
  }

  /** Invalidate a user's recommendations after a taste-changing mutation. */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.del(RecommendationCacheService.KEYS.user(userId));
  }

  // --- Shared candidate caches --------------------------------------------

  async getPool(): Promise<ExternalAnimeDto[] | null> {
    return this.cache.get<ExternalAnimeDto[]>(
      RecommendationCacheService.KEYS.pool,
    );
  }

  async setPool(pool: ExternalAnimeDto[]): Promise<void> {
    await this.cache.set(
      RecommendationCacheService.KEYS.pool,
      pool,
      RecommendationCacheService.TTL.pool,
    );
  }

  async getTrending(): Promise<ExternalAnimeDto[] | null> {
    return this.cache.get<ExternalAnimeDto[]>(
      RecommendationCacheService.KEYS.trending,
    );
  }

  async setTrending(trending: ExternalAnimeDto[]): Promise<void> {
    await this.cache.set(
      RecommendationCacheService.KEYS.trending,
      trending,
      RecommendationCacheService.TTL.trending,
    );
  }

  // --- Helpers -------------------------------------------------------------

  /** Accept both the current payload and legacy id-only cache entries. */
  private normalize(raw: CachedReco | number[] | null): CachedReco | null {
    if (!raw) return null;
    if (Array.isArray(raw)) {
      return { ids: raw, reasons: {}, scores: {}, trending: {} };
    }
    return {
      ids: raw.ids ?? [],
      reasons: raw.reasons ?? {},
      scores: raw.scores ?? {},
      trending: raw.trending ?? {},
    };
  }
}

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { jikanClient } from "../../services/jikan.service";
import type { ExternalAnimeDto } from "../../services/jikan.service";
import { buildTasteProfile } from "../../services/recommendation.service";
import { RecommendationScoringService } from "../../services/scoring/recommendation-scoring.service";
import type {
  CandidateAnime,
  UserSignals,
  WatchHistorySignal,
} from "../../services/scoring/scoring.types";
import { RecommendationCacheService } from "./recommendation-cache.service";
import type {
  RecommendationCacheMeta,
  RecommendationReason,
} from "./dto/recommendation.dto";

/**
 * Minimal shape of the loaded user needed to assemble UserSignals.
 * Declared locally so `buildUserSignals` stays pure and unit-testable without a
 * live Prisma client (the real query result is structurally compatible).
 */
export interface RecommendationUserData {
  preferences: {
    preferredGenres: string[];
    genreScores: Prisma.JsonValue;
  } | null;
  favorites: Array<{ animeId: number; anime: { genres: string[] } }>;
  watchHistory: Array<{
    animeId: number;
    progress: number;
    duration: number;
    updatedAt: Date;
    anime: { genres: string[]; themes: string[] };
  }>;
  ratings?: Array<{ animeId: number; score: number }>;
}

/** Jikan caps `limit` at 25; keep the pool request within that bound. */
const POOL_SIZE = 25;
const RESULT_LIMIT = 18;

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recoCache: RecommendationCacheService,
    private readonly animeCache: AnimeCacheService,
    private readonly scoring: RecommendationScoringService,
  ) {}

  async getForUser(userId: string) {
    const cached = await this.recoCache.getUser(userId);
    if (cached && cached.ids.length > 0) {
      const animes = await this.prisma.anime.findMany({
        where: { id: { in: cached.ids } },
      });
      if (animes.length > 0) {
        // Restore the cached ranking order (findMany does not preserve `in`
        // order) and re-attach reasons/score/trending per anime.
        const byId = new Map(animes.map((a) => [a.id, a]));
        return cached.ids
          .map((id) => byId.get(id))
          .filter((a): a is NonNullable<typeof a> => Boolean(a))
          .map((a) =>
            this.fromDb(
              a,
              cached.reasons[a.id] ?? [],
              cached.scores?.[a.id],
              cached.trending?.[a.id],
            ),
          );
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        favorites: { include: { anime: true }, take: 50 },
        watchHistory: {
          include: { anime: true },
          orderBy: { updatedAt: "desc" },
          take: 50,
        },
        ratings: { take: 100 },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    const signals = this.buildUserSignals(user);

    const candidates = await this.loadCandidates();
    if (candidates.length === 0) {
      // Degraded upstream (e.g. Jikan unavailable). Return an empty ranking
      // without persisting a cache entry, so the request retries next time and
      // the frontend transparently falls back to its client engine.
      this.logger.warn({
        event: "reco_no_candidates",
        userId,
        message: "No candidates available — returning empty (client fallback)",
      });
      return [];
    }
    await this.animeCache.upsertMany(candidates);

    const { response, ids, reasonsByAnime, scoreByAnime, trendingByAnime } =
      this.rankCandidates(signals, candidates, { limit: RESULT_LIMIT });

    const personalized = this.isPersonalized(signals);
    const meta: RecommendationCacheMeta = {
      personalized,
      reasons: reasonsByAnime,
    };
    const ttl = personalized
      ? RecommendationCacheService.TTL.user
      : RecommendationCacheService.TTL.userColdStart;

    await this.prisma.recommendationCache.create({
      data: {
        userId,
        animeIds: ids,
        expiresAt: new Date(Date.now() + ttl * 1000),
        meta: meta as unknown as Prisma.InputJsonValue,
      },
    });
    await this.recoCache.setUser(
      userId,
      {
        ids,
        reasons: reasonsByAnime,
        scores: scoreByAnime,
        trending: trendingByAnime,
      },
      ttl,
    );

    return response;
  }

  /**
   * Load and merge the candidate set (top/popular pool + airing trending),
   * served from the shared Redis caches to avoid hammering Jikan. On a miss the
   * fetched list is cached for reuse across all users.
   */
  async loadCandidates(): Promise<CandidateAnime[]> {
    let pool = await this.recoCache.getPool();
    if (!pool) {
      try {
        pool = await jikanClient.getPool(POOL_SIZE);
        await this.recoCache.setPool(pool);
      } catch (err) {
        this.logCandidateFailure("pool", err);
        pool = [];
      }
    }

    let trending = await this.recoCache.getTrending();
    if (!trending) {
      try {
        trending = await jikanClient.getTrending(RESULT_LIMIT);
        await this.recoCache.setTrending(trending);
      } catch (err) {
        this.logCandidateFailure("trending", err);
        trending = [];
      }
    }

    return this.mergeCandidates(pool, trending);
  }

  /**
   * Structured warning for a degraded candidate source. Keeps observability:
   * the failure is never swallowed silently, but it no longer bubbles up to a
   * 500 — the endpoint degrades to a partial/empty ranking instead.
   */
  private logCandidateFailure(source: "pool" | "trending", err: unknown): void {
    this.logger.warn({
      event: "reco_candidate_source_failed",
      source,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  /**
   * Map persisted user data (preferences, favorites, watch history, ratings)
   * into the scoring engine's `UserSignals`. Pure and deterministic.
   *
   * Cold-start users (no favorites/history/preferences) yield empty taste and
   * history, so scoring falls back to its quality/popularity/trends proxy.
   */
  buildUserSignals(user: RecommendationUserData): UserSignals {
    const favoriteGenres = user.favorites.flatMap((f) => f.anime.genres);
    const historyGenres = user.watchHistory.flatMap((h) => h.anime.genres);
    const genreScores =
      (user.preferences?.genreScores as Record<string, number> | null) ?? {};

    const tasteProfile = buildTasteProfile({
      preferredGenres: user.preferences?.preferredGenres ?? [],
      genreScores,
      favoriteGenres,
      historyGenres,
    });

    const history: WatchHistorySignal[] = user.watchHistory.map((h) => ({
      animeId: h.animeId,
      genres: h.anime.genres,
      themes: h.anime.themes,
      progress: h.progress,
      duration: h.duration,
      updatedAt: h.updatedAt,
    }));

    const ratings: Record<number, number> = {};
    for (const r of user.ratings ?? []) ratings[r.animeId] = r.score;

    const seenAnimeIds = [
      ...user.favorites.map((f) => f.animeId),
      ...new Set(user.watchHistory.map((h) => h.animeId)),
    ];

    return {
      tasteProfile,
      favoriteGenres,
      historyGenres,
      history,
      ratings,
      seenAnimeIds,
    };
  }

  /**
   * Run the scoring engine over candidates and shape the results: response DTOs
   * (with additive `reasons`), the ranked id list and a reasons-by-anime map for
   * cache persistence.
   */
  rankCandidates(
    signals: UserSignals,
    candidates: CandidateAnime[],
    options: { limit?: number } = {},
  ) {
    const scored = this.scoring.score(signals, candidates, {
      limit: options.limit,
    });

    const reasonsByAnime: Record<number, RecommendationReason[]> = {};
    const scoreByAnime: Record<number, number> = {};
    const trendingByAnime: Record<number, boolean> = {};
    const response = scored.map((s) => {
      const trending = s.anime.trending ?? false;
      if (s.reasons.length > 0) reasonsByAnime[s.anime.id] = s.reasons;
      scoreByAnime[s.anime.id] = s.score;
      trendingByAnime[s.anime.id] = trending;
      return {
        ...this.animeCache.toResponse(s.anime),
        reasons: s.reasons,
        score: s.score,
        trending,
      };
    });

    return {
      scored,
      response,
      ids: scored.map((s) => s.anime.id),
      reasonsByAnime,
      scoreByAnime,
      trendingByAnime,
    };
  }

  /** Union pool + trending into a deduped candidate set, flagging trending. */
  private mergeCandidates(
    pool: ExternalAnimeDto[],
    trending: ExternalAnimeDto[],
  ): CandidateAnime[] {
    const trendingIds = new Set(trending.map((t) => t.id));
    const byId = new Map<number, CandidateAnime>();
    for (const anime of [...trending, ...pool]) {
      if (byId.has(anime.id)) continue;
      byId.set(anime.id, { ...anime, trending: trendingIds.has(anime.id) });
    }
    return [...byId.values()];
  }

  private isPersonalized(signals: UserSignals): boolean {
    return (
      Object.keys(signals.tasteProfile).length > 0 || signals.history.length > 0
    );
  }

  private fromDb(
    anime: {
      id: number;
      title: string;
      titleEnglish: string | null;
      synopsis: string | null;
      image: string | null;
      banner: string | null;
      score: number;
      rank: number | null;
      popularity: number | null;
      genres: string[];
      themes: string[];
      status: string | null;
      episodes: number;
      year: number | null;
      season: string | null;
      type: string | null;
    },
    reasons: RecommendationReason[] = [],
    score?: number,
    trending?: boolean,
  ) {
    return {
      id: String(anime.id),
      malId: anime.id,
      title: anime.title,
      titleEnglish: anime.titleEnglish ?? undefined,
      description: anime.synopsis ?? "",
      image: anime.image ?? "",
      banner: anime.banner ?? anime.image ?? "",
      rating: anime.score,
      rank: anime.rank ?? undefined,
      popularity: anime.popularity ?? undefined,
      genres: anime.genres,
      themes: anime.themes,
      status: anime.status,
      type: anime.type,
      episodeCount: anime.episodes,
      year: anime.year ?? undefined,
      season: anime.season ?? undefined,
      source: "jikan" as const,
      reasons,
      score,
      trending,
    };
  }
}

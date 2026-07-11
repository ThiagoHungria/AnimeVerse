/**
 * SmartFeedEngineService — contextual, anchor-based feeds (FASE 2.2-G.2.1).
 *
 * Produces the "porque você assistiu X" (because-watched) and "parecido com um
 * favorito" (like-favorite) sections. Each section is anchored on a single
 * source anime and every recommendation carries a contextual reason pointing
 * back to that anchor (`sourceAnimeId`/`sourceTitle`).
 *
 * This engine is deliberately SEPARATE from RecommendationScoringService: the
 * global blended scoring (for-you / taste) is untouched. Anchor comparison uses
 * the pure `scoreAgainstAnchor` function below, which is deterministic and
 * side-effect free so it can be unit-tested without any I/O.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { RecommendationEngineService } from "./recommendation.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import type { CachedFeeds } from "./recommendation-cache.service";
import type {
  CandidateAnime,
} from "../../services/scoring/scoring.types";
import type { ExternalAnimeDto } from "../../services/jikan.service";
import type {
  RecommendationReason,
  RecommendationReasonType,
  RecommendedAnimeDto,
} from "./dto/recommendation.dto";

/** Minimal source anime a section is built around. */
export interface AnchorAnime {
  id: number;
  title: string;
  genres: string[];
  themes: string[];
}

/** A candidate scored against a single anchor, with its contextual reason. */
export interface AnchoredScore {
  anime: CandidateAnime;
  /** Blended anchor-affinity score in [0, 1]. */
  score: number;
  reasons: RecommendationReason[];
}

/** Tunables for a single anchor comparison run. */
export interface AnchorScoringOptions {
  /** Max results to return (default 12). */
  limit?: number;
  /** Extra ids to drop (the anchor id itself is always excluded). */
  excludeIds?: number[];
  /** Reason type to emit (default "genre_similar"). */
  reasonType?: RecommendationReasonType;
  /** Builds the human-readable label for the section's reasons. */
  makeLabel?: (anchor: AnchorAnime) => string;
}

/** A contextual feed section returned to the API layer. */
export interface SmartFeedSection {
  id: "because-watched" | "like-favorite";
  title: string;
  eyebrow: string;
  /** The anime this section is anchored on. */
  source: { animeId: number; title: string };
  items: RecommendedAnimeDto[];
}

const SECTION_LIMIT = 12;
const FAVORITE_ANCHOR_CANDIDATES = 3;

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

const traitsOf = (item: { genres: string[]; themes?: string[] }): string[] => [
  ...(item.genres ?? []),
  ...(item.themes ?? []),
];

/** Global-quality tie-breaker so equally-relevant picks favor better anime. */
const qualityOf = (anime: CandidateAnime): number => clamp01((anime.score ?? 0) / 10);

/**
 * Rank candidates by how much they share the anchor's genres/themes, with a
 * light quality tie-breaker, and attach a contextual reason to each.
 *
 * Pure and deterministic: no DB, cache, clock or randomness. Candidates with no
 * trait overlap are dropped so the section stays contextually relevant, and the
 * anchor itself (plus any `excludeIds`) is never recommended back.
 */
export function scoreAgainstAnchor(
  anchor: AnchorAnime,
  candidates: CandidateAnime[],
  options: AnchorScoringOptions = {},
): AnchoredScore[] {
  const limit = options.limit ?? SECTION_LIMIT;
  const reasonType = options.reasonType ?? "genre_similar";
  const makeLabel =
    options.makeLabel ?? ((a: AnchorAnime) => `Recomendado por causa de ${a.title}`);

  const anchorTraits = traitsOf(anchor);
  if (anchorTraits.length === 0) return [];
  const anchorSet = new Set(anchorTraits);
  const exclude = new Set<number>([anchor.id, ...(options.excludeIds ?? [])]);

  return candidates
    .filter((c) => !exclude.has(c.id))
    .map((c) => {
      const overlapCount = traitsOf(c).filter((t) => anchorSet.has(t)).length;
      const overlap = clamp01(overlapCount / anchorTraits.length);
      return { anime: c, overlap, score: clamp01(overlap * 0.7 + qualityOf(c) * 0.3) };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      anime: x.anime,
      score: x.score,
      reasons: [
        {
          type: reasonType,
          sourceAnimeId: anchor.id,
          sourceTitle: anchor.title,
          label: makeLabel(anchor),
        },
      ],
    }));
}

@Injectable()
export class SmartFeedEngineService {
  private readonly logger = new Logger(SmartFeedEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: RecommendationEngineService,
    private readonly animeCache: AnimeCacheService,
    private readonly recoCache: RecommendationCacheService,
  ) {}

  /**
   * Build the contextual feeds for a user. Returns only non-empty sections, in
   * order: because-watched, like-favorite. Degrades to an empty array (client
   * fallback) when the shared candidate pool is unavailable.
   *
   * Served from the per-user `reco:feeds` cache when warm (rebuilt from the DB,
   * preserving section/item order, reasons and source); a miss recomputes the
   * anchor scoring and repopulates the cache.
   */
  async getFeedsForUser(userId: string): Promise<SmartFeedSection[]> {
    const startedAt = Date.now();
    const cached = await this.recoCache.getFeeds(userId);
    if (cached && cached.sections.length > 0) {
      const rebuilt = await this.reconstructFromCache(cached);
      if (rebuilt) {
        this.logger.log({
          event: "smartfeeds_cache_hit",
          userId,
          sections: rebuilt.length,
        });
        return rebuilt;
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: { include: { anime: true }, take: 50 },
        watchHistory: {
          include: { anime: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    const candidates = await this.engine.loadCandidates();
    if (candidates.length === 0) {
      this.logger.warn({
        event: "smartfeeds_no_candidates",
        userId,
        message: "No candidates available — returning empty (client fallback)",
      });
      return [];
    }
    // Persist candidates so a warm cache can be rebuilt from the DB later.
    await this.animeCache.upsertMany(candidates);

    const seen = [
      ...user.favorites.map((f) => f.animeId),
      ...user.watchHistory.map((h) => h.animeId),
    ];

    const sections: SmartFeedSection[] = [];

    const watched = this.buildBecauseWatched(user.watchHistory, candidates, seen);
    if (watched) sections.push(watched);

    const favorite = this.buildLikeFavorite(user.favorites, candidates, seen);
    if (favorite) sections.push(favorite);

    if (sections.length > 0) {
      await this.recoCache.setFeeds(userId, this.toCache(sections));
    }

    this.logger.log({
      event: "smartfeeds_cache_miss",
      userId,
      sections: sections.length,
      candidates: candidates.length,
      tookMs: Date.now() - startedAt,
    });

    return sections;
  }

  /**
   * Rebuild sections from the cache: fetch every referenced anime once, then
   * remap per section — preserving section order, item order, reasons and the
   * anchor `source`. Returns null when nothing resolves (so the caller
   * recomputes), e.g. if the DB rows were evicted.
   */
  private async reconstructFromCache(
    cached: CachedFeeds,
  ): Promise<SmartFeedSection[] | null> {
    const allIds = [...new Set(cached.sections.flatMap((s) => s.ids))];
    if (allIds.length === 0) return null;

    const rows = await this.prisma.anime.findMany({
      where: { id: { in: allIds } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const sections = cached.sections
      .map((s) => {
        const items: RecommendedAnimeDto[] = s.ids
          .map((id) => byId.get(id))
          .filter((row): row is NonNullable<typeof row> => Boolean(row))
          .map((row) => ({
            ...this.animeCache.toResponse(this.dbRowToExternal(row)),
            reasons: s.reasons[row.id] ?? [],
            score: s.scores?.[row.id],
            trending: s.trending?.[row.id],
          }));
        return {
          id: s.id as SmartFeedSection["id"],
          title: s.title,
          eyebrow: s.eyebrow,
          source: s.source ?? { animeId: 0, title: "" },
          items,
        };
      })
      .filter((s) => s.items.length > 0);

    return sections.length > 0 ? sections : null;
  }

  /** "Porque você assistiu X" — anchored on the most recently watched anime. */
  private buildBecauseWatched(
    history: Array<{ anime: AnchorSource }>,
    candidates: CandidateAnime[],
    seen: number[],
  ): SmartFeedSection | null {
    const last = history[0];
    if (!last) return null;

    const anchor = this.toAnchor(last.anime);
    const ranked = scoreAgainstAnchor(anchor, candidates, {
      limit: SECTION_LIMIT,
      excludeIds: seen,
      reasonType: "genre_similar",
      makeLabel: (a) => `Porque você assistiu ${a.title}`,
    });
    if (ranked.length === 0) return null;

    return this.toSection(
      "because-watched",
      `Porque você assistiu ${anchor.title}`,
      "Continuidade de gosto",
      anchor,
      ranked,
    );
  }

  /**
   * "Parecido com um favorito" — considers up to 3 favorites as anchor
   * candidates and keeps the one that yields the strongest section.
   */
  private buildLikeFavorite(
    favorites: Array<{ anime: AnchorSource }>,
    candidates: CandidateAnime[],
    seen: number[],
  ): SmartFeedSection | null {
    const anchors = favorites
      .slice(0, FAVORITE_ANCHOR_CANDIDATES)
      .map((f) => this.toAnchor(f.anime));
    if (anchors.length === 0) return null;

    const best = this.selectBestAnchor(anchors, candidates, seen);
    if (!best) return null;

    return this.toSection(
      "like-favorite",
      `Parecido com ${best.anchor.title}`,
      "Mesma vibe",
      best.anchor,
      best.ranked,
    );
  }

  /**
   * Pick the anchor that produces the richest section (most results, then
   * highest top score). Reuses the computed ranking to avoid re-scoring.
   */
  private selectBestAnchor(
    anchors: AnchorAnime[],
    candidates: CandidateAnime[],
    seen: number[],
  ): { anchor: AnchorAnime; ranked: AnchoredScore[] } | null {
    let best: {
      anchor: AnchorAnime;
      ranked: AnchoredScore[];
      count: number;
      topScore: number;
    } | null = null;

    for (const anchor of anchors) {
      const ranked = scoreAgainstAnchor(anchor, candidates, {
        limit: SECTION_LIMIT,
        excludeIds: seen,
        reasonType: "genre_similar",
        makeLabel: (a) => `Parecido com ${a.title}`,
      });
      if (ranked.length === 0) continue;

      const topScore = ranked[0].score;
      const better =
        !best ||
        ranked.length > best.count ||
        (ranked.length === best.count && topScore > best.topScore);
      if (better) best = { anchor, ranked, count: ranked.length, topScore };
    }

    return best ? { anchor: best.anchor, ranked: best.ranked } : null;
  }

  private toAnchor(anime: AnchorSource): AnchorAnime {
    return {
      id: anime.id,
      title: anime.title,
      genres: anime.genres ?? [],
      themes: anime.themes ?? [],
    };
  }

  private toSection(
    id: SmartFeedSection["id"],
    title: string,
    eyebrow: string,
    anchor: AnchorAnime,
    ranked: AnchoredScore[],
  ): SmartFeedSection {
    return {
      id,
      title,
      eyebrow,
      source: { animeId: anchor.id, title: anchor.title },
      items: ranked.map((r) => ({
        ...this.animeCache.toResponse(r.anime),
        reasons: r.reasons,
        score: r.score,
        trending: r.anime.trending ?? false,
      })),
    };
  }

  /** Flatten computed sections into the cacheable shape (ids + metadata maps). */
  private toCache(sections: SmartFeedSection[]): CachedFeeds {
    return {
      sections: sections.map((s) => {
        const reasons: Record<number, RecommendationReason[]> = {};
        const scores: Record<number, number> = {};
        const trending: Record<number, boolean> = {};
        const ids = s.items.map((item) => {
          if (item.reasons.length > 0) reasons[item.malId] = item.reasons;
          if (typeof item.score === "number") scores[item.malId] = item.score;
          if (typeof item.trending === "boolean") {
            trending[item.malId] = item.trending;
          }
          return item.malId;
        });
        return {
          id: s.id,
          title: s.title,
          eyebrow: s.eyebrow,
          source: s.source,
          ids,
          reasons,
          scores,
          trending,
        };
      }),
    };
  }

  /** Map a persisted Anime row back to the external DTO shape `toResponse` expects. */
  private dbRowToExternal(row: {
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
  }): ExternalAnimeDto {
    return {
      id: row.id,
      title: row.title,
      titleEnglish: row.titleEnglish ?? undefined,
      synopsis: row.synopsis ?? undefined,
      poster: row.image ?? undefined,
      banner: row.banner ?? undefined,
      score: row.score,
      rank: row.rank ?? undefined,
      popularity: row.popularity ?? undefined,
      genres: row.genres,
      themes: row.themes,
      status: row.status ?? undefined,
      type: row.type ?? undefined,
      episodes: row.episodes,
      season: row.season ?? undefined,
      year: row.year ?? undefined,
    };
  }
}

/** Minimal anime shape needed to build an anchor (subset of the Anime row). */
interface AnchorSource {
  id: number;
  title: string;
  genres: string[];
  themes: string[];
}

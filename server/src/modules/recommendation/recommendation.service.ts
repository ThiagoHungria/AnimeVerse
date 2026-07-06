import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { jikanClient } from "../../services/jikan.service";
import { recommendWithEmbeddings } from "../../services/embedding.service";
import { buildTasteProfile } from "../../services/recommendation.service";

@Injectable()
export class RecommendationEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  async getForUser(userId: string) {
    const cacheKey = `reco:${userId}`;
    const cached = await this.cache.get<number[]>(cacheKey);
    if (cached) {
      const animes = await this.prisma.anime.findMany({
        where: { id: { in: cached } },
      });
      if (animes.length > 0) {
        return animes.map((a) => this.fromDb(a));
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
      },
    });
    if (!user) throw new NotFoundException("User not found");

    const favoriteGenres = user.favorites.flatMap((f) => f.anime.genres);
    const historyGenres = user.watchHistory.flatMap((h) => h.anime.genres);
    const genreScores =
      (user.preferences?.genreScores as Record<string, number>) ?? {};

    const profile = buildTasteProfile({
      preferredGenres: user.preferences?.preferredGenres ?? [],
      genreScores,
      favoriteGenres,
      historyGenres,
    });

    const excludeIds = [
      ...user.favorites.map((f) => f.animeId),
      ...new Set(user.watchHistory.map((h) => h.animeId)),
    ];

    const pool = await jikanClient.getPool(30);
    await this.animeCache.upsertMany(pool);

    const recommended = recommendWithEmbeddings(pool, profile, excludeIds, 18);
    const ids = recommended.map((a) => a.id);

    // Persist to DB cache table + memory cache.
    await this.prisma.recommendationCache.create({
      data: {
        userId,
        animeIds: ids,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        meta: { personalized: Object.keys(profile).length > 0 },
      },
    });
    await this.cache.set(cacheKey, ids, 1800);

    return recommended.map((a) => this.animeCache.toResponse(a));
  }

  private fromDb(anime: {
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
  }) {
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
    };
  }
}

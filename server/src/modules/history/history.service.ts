import { Injectable } from "@nestjs/common";
import { paginate, parsePagination } from "../../common/utils/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { RecommendationCacheService } from "../recommendation/recommendation-cache.service";
import { jikanClient } from "../../services/jikan.service";
import type { HistoryDto } from "./dto/history.dto";

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly animeCache: AnimeCacheService,
    private readonly recoCache: RecommendationCacheService,
  ) {}

  async record(userId: string, dto: HistoryDto) {
    await this.ensureAnimeCached(dto.animeId);

    const entry = await this.prisma.watchHistory.upsert({
      where: {
        userId_animeId_episodeId: {
          userId,
          animeId: dto.animeId,
          episodeId: dto.episodeId,
        },
      },
      create: {
        userId,
        animeId: dto.animeId,
        episodeId: dto.episodeId,
        episodeNumber: dto.episodeNumber,
        episodeTitle: dto.episodeTitle,
        progress: dto.progress,
        duration: dto.duration,
      },
      update: {
        progress: dto.progress,
        duration: dto.duration,
        episodeTitle: dto.episodeTitle,
      },
      include: { anime: true },
    });

    // Accumulate total watch time on the user profile.
    if (dto.progress > 0) {
      await this.prisma.userPreferences.upsert({
        where: { userId },
        create: { userId, totalWatchTime: dto.progress },
        update: { totalWatchTime: { increment: 5 } },
      });
    }

    // Watch history feeds the behavioural signal — drop stale recommendations.
    await this.recoCache.invalidateUser(userId);

    return entry;
  }

  async list(userId: string, query: { page?: string; limit?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { userId },
        include: { anime: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { userId } }),
    ]);

    const data = items.map((h) => ({
      animeId: String(h.animeId),
      episodeId: h.episodeId,
      animeTitle: h.anime.title,
      animeImage: h.anime.banner ?? h.anime.image ?? "",
      episodeNumber: h.episodeNumber,
      episodeTitle: h.episodeTitle,
      progress: h.progress,
      duration: h.duration,
      updatedAt: h.updatedAt.getTime(),
    }));

    return paginate(data, total, page, limit);
  }

  /** In-progress episodes (< 90% watched), newest first. */
  async continueWatching(userId: string) {
    const items = await this.prisma.watchHistory.findMany({
      where: { userId },
      include: { anime: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return items
      .filter((h) => h.duration > 0 && h.progress / h.duration < 0.9)
      .map((h) => ({
        animeId: String(h.animeId),
        episodeId: h.episodeId,
        animeTitle: h.anime.title,
        animeImage: h.anime.banner ?? h.anime.image ?? "",
        episodeNumber: h.episodeNumber,
        episodeTitle: h.episodeTitle,
        progress: h.progress,
        duration: h.duration,
        updatedAt: h.updatedAt.getTime(),
      }));
  }

  private async ensureAnimeCached(animeId: number) {
    const cached = await this.prisma.anime.findUnique({ where: { id: animeId } });
    if (cached) return cached;
    const ext = await jikanClient.getById(animeId);
    return this.animeCache.upsertOne(ext);
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { paginate, parsePagination } from "../../common/utils/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { jikanClient } from "../../services/jikan.service";

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  async add(userId: string, animeId: number) {
    await this.ensureAnimeCached(animeId);

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_animeId: { userId, animeId } },
    });
    if (existing) throw new ConflictException("Already favorited");

    return this.prisma.favorite.create({
      data: { userId, animeId },
      include: { anime: true },
    });
  }

  async remove(userId: string, animeId: number) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_animeId: { userId, animeId } },
    });
    if (!fav) throw new NotFoundException("Favorite not found");
    await this.prisma.favorite.delete({ where: { id: fav.id } });
    return { success: true };
  }

  async list(userId: string, query: { page?: string; limit?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: { anime: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    const data = items.map((f) => ({
      id: String(f.anime.id),
      malId: f.anime.id,
      title: f.anime.title,
      titleEnglish: f.anime.titleEnglish,
      description: f.anime.synopsis ?? "",
      image: f.anime.image ?? "",
      banner: f.anime.banner ?? f.anime.image ?? "",
      rating: f.anime.score,
      genres: f.anime.genres,
      themes: f.anime.themes,
      episodeCount: f.anime.episodes,
      year: f.anime.year,
      favoritedAt: f.createdAt,
    }));

    return paginate(data, total, page, limit);
  }

  private async ensureAnimeCached(animeId: number) {
    const cached = await this.prisma.anime.findUnique({ where: { id: animeId } });
    if (cached) return cached;
    const ext = await jikanClient.getById(animeId);
    return this.animeCache.upsertOne(ext);
  }
}

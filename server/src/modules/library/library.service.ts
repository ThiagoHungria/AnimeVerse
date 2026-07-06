import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { paginate, parsePagination } from "../../common/utils/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { AnimeCacheService } from "../anime/anime-cache.service";
import { jikanClient } from "../../services/jikan.service";
import type { LibraryUpsertDto } from "./dto/library.dto";

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  async upsert(userId: string, dto: LibraryUpsertDto) {
    await this.ensureAnimeCached(dto.animeId);

    return this.prisma.libraryEntry.upsert({
      where: { userId_animeId: { userId, animeId: dto.animeId } },
      create: {
        userId,
        animeId: dto.animeId,
        list: dto.list,
      },
      update: { list: dto.list },
      include: { anime: true },
    });
  }

  async remove(userId: string, animeId: number) {
    const entry = await this.prisma.libraryEntry.findUnique({
      where: { userId_animeId: { userId, animeId } },
    });
    if (!entry) throw new NotFoundException("Library entry not found");
    await this.prisma.libraryEntry.delete({ where: { id: entry.id } });
    return { success: true };
  }

  async list(
    userId: string,
    query: { list?: string; page?: string; limit?: string },
  ) {
    const { page, limit, skip } = parsePagination(query);
    const where = {
      userId,
      ...(query.list ? { list: query.list } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.libraryEntry.findMany({
        where,
        include: { anime: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.libraryEntry.count({ where }),
    ]);

    const data = items.map((e) => ({
      list: e.list,
      anime: {
        id: String(e.anime.id),
        malId: e.anime.id,
        title: e.anime.title,
        titleEnglish: e.anime.titleEnglish,
        description: e.anime.synopsis ?? "",
        image: e.anime.image ?? "",
        banner: e.anime.banner ?? e.anime.image ?? "",
        rating: e.anime.score,
        genres: e.anime.genres,
        themes: e.anime.themes,
        episodeCount: e.anime.episodes,
        year: e.anime.year,
        season: e.anime.season,
      },
      updatedAt: e.updatedAt.getTime(),
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

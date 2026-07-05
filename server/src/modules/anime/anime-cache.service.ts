import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { ExternalAnimeDto } from "../../services/jikan.service";

@Injectable()
export class AnimeCacheService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert anime metadata into the local cache table. */
  async upsertMany(animes: ExternalAnimeDto[]) {
    await Promise.all(animes.map((a) => this.upsertOne(a)));
  }

  async upsertOne(anime: ExternalAnimeDto) {
    return this.prisma.anime.upsert({
      where: { id: anime.id },
      create: this.toDb(anime),
      update: { ...this.toDb(anime), cachedAt: new Date() },
    });
  }

  toResponse(anime: ExternalAnimeDto) {
    return {
      id: String(anime.id),
      malId: anime.id,
      title: anime.title,
      titleEnglish: anime.titleEnglish,
      description: anime.synopsis ?? "Sinopse não disponível.",
      image: anime.poster ?? "",
      banner: anime.banner ?? anime.poster ?? "",
      rating: anime.score ?? 0,
      rank: anime.rank,
      popularity: anime.popularity,
      genres: anime.genres,
      themes: anime.themes,
      status: anime.status,
      type: anime.type,
      episodeCount: anime.episodes ?? 0,
      year: anime.year,
      season: anime.season,
      source: "jikan" as const,
    };
  }

  private toDb(anime: ExternalAnimeDto) {
    return {
      id: anime.id,
      title: anime.title,
      titleEnglish: anime.titleEnglish,
      synopsis: anime.synopsis,
      image: anime.poster,
      banner: anime.banner,
      score: anime.score ?? 0,
      rank: anime.rank,
      popularity: anime.popularity,
      genres: anime.genres,
      themes: anime.themes,
      status: anime.status,
      episodes: anime.episodes ?? 0,
      season: anime.season,
      year: anime.year,
      type: anime.type,
    };
  }
}

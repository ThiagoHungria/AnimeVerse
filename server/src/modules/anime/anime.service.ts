import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { jikanClient } from "../../services/jikan.service";
import { AnimeCacheService } from "./anime-cache.service";

@Injectable()
export class AnimeService {
  constructor(
    private readonly cache: CacheService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  async getTrending() {
    const key = "anime:trending";
    const cached = await this.cache.get<ReturnType<AnimeCacheService["toResponse"]>[]>(key);
    if (cached) return cached;

    const list = await jikanClient.getTrending();
    await this.animeCache.upsertMany(list);
    const response = list.map((a) => this.animeCache.toResponse(a));
    await this.cache.set(key, response, 1800);
    return response;
  }

  async search(q: string) {
    if (!q.trim()) return this.getTrending();
    const key = `anime:search:${q.toLowerCase()}`;
    const cached = await this.cache.get<ReturnType<AnimeCacheService["toResponse"]>[]>(key);
    if (cached) return cached;

    const list = await jikanClient.search(q.trim());
    await this.animeCache.upsertMany(list);
    const response = list.map((a) => this.animeCache.toResponse(a));
    await this.cache.set(key, response, 600);
    return response;
  }

  async getById(id: number) {
    const key = `anime:${id}`;
    const cached = await this.cache.get<ReturnType<AnimeCacheService["toResponse"]>>(key);
    if (cached) return cached;

    try {
      const anime = await jikanClient.getById(id);
      await this.animeCache.upsertOne(anime);
      const response = this.animeCache.toResponse(anime);
      await this.cache.set(key, response, 3600);
      return response;
    } catch {
      throw new NotFoundException(`Anime ${id} not found`);
    }
  }
}

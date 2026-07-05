import { Module } from "@nestjs/common";
import { AnimeController } from "./anime.controller";
import { AnimeService } from "./anime.service";
import { AnimeCacheService } from "./anime-cache.service";

@Module({
  controllers: [AnimeController],
  providers: [AnimeService, AnimeCacheService],
  exports: [AnimeService, AnimeCacheService],
})
export class AnimeModule {}

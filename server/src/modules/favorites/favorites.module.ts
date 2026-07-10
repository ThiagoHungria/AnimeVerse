import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { RecommendationModule } from "../recommendation/recommendation.module";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";

@Module({
  imports: [AnimeModule, RecommendationModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}

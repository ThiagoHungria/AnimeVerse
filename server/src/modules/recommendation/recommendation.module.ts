import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { RecommendationScoringService } from "../../services/scoring/recommendation-scoring.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import { RecommendationController } from "./recommendation.controller";
import { RecommendationEngineService } from "./recommendation.service";

@Module({
  imports: [AnimeModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationEngineService,
    RecommendationScoringService,
    RecommendationCacheService,
  ],
  exports: [RecommendationCacheService],
})
export class RecommendationModule {}

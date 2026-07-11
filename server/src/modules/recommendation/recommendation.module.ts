import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { RecommendationScoringService } from "../../services/scoring/recommendation-scoring.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import { RecommendationController } from "./recommendation.controller";
import { RecommendationEngineService } from "./recommendation.service";
import { SmartFeedEngineService } from "./smart-feed-engine.service";

@Module({
  imports: [AnimeModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationEngineService,
    RecommendationScoringService,
    RecommendationCacheService,
    SmartFeedEngineService,
  ],
  exports: [RecommendationCacheService],
})
export class RecommendationModule {}

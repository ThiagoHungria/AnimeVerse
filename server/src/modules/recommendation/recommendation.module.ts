import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { RecommendationController } from "./recommendation.controller";
import { RecommendationEngineService } from "./recommendation.service";

@Module({
  imports: [AnimeModule],
  controllers: [RecommendationController],
  providers: [RecommendationEngineService],
})
export class RecommendationModule {}

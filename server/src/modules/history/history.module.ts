import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { RecommendationModule } from "../recommendation/recommendation.module";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [AnimeModule, RecommendationModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}

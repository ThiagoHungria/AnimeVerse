import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [AnimeModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}

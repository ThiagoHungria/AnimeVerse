import { Module } from "@nestjs/common";
import { AnimeModule } from "../anime/anime.module";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";

@Module({
  imports: [AnimeModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}

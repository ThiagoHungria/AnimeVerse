import { Controller, Get, Param, Query } from "@nestjs/common";
import { AnimeService } from "./anime.service";

@Controller("anime")
export class AnimeController {
  constructor(private readonly anime: AnimeService) {}

  @Get("trending")
  getTrending() {
    return this.anime.getTrending();
  }

  @Get("search")
  search(@Query("q") q = "") {
    return this.anime.search(q);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.anime.getById(Number(id));
  }
}

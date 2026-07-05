import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RecommendationEngineService } from "./recommendation.service";

@Controller("recommendations")
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly engine: RecommendationEngineService) {}

  @Get(":userId")
  getForUser(@Param("userId") userId: string) {
    return this.engine.getForUser(userId);
  }
}

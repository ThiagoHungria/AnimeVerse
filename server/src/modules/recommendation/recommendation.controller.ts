import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RecommendationEngineService } from "./recommendation.service";

@Controller("recommendations")
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly engine: RecommendationEngineService) {}

  @Get(":userId")
  getForUser(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
  ) {
    if (user.id !== userId) {
      throw new ForbiddenException(
        "Cannot access another user's recommendations",
      );
    }
    return this.engine.getForUser(userId);
  }
}

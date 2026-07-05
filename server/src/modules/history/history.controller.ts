import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { historySchema, type HistoryDto } from "./dto/history.dto";
import { HistoryService } from "./history.service";

@Controller("history")
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Post()
  record(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(historySchema)) dto: HistoryDto,
  ) {
    return this.history.record(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.history.list(user.id, query);
  }

  @Get("continue")
  continueWatching(@CurrentUser() user: AuthUser) {
    return this.history.continueWatching(user.id);
  }
}

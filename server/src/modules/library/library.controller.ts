import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { libraryUpsertSchema, type LibraryUpsertDto } from "./dto/library.dto";
import { LibraryService } from "./library.service";

@Controller("library")
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Post()
  upsert(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(libraryUpsertSchema)) dto: LibraryUpsertDto,
  ) {
    return this.library.upsert(user.id, dto);
  }

  @Delete(":animeId")
  remove(
    @CurrentUser() user: AuthUser,
    @Param("animeId") animeId: string,
  ) {
    return this.library.remove(user.id, Number(animeId));
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: { list?: string; page?: string; limit?: string },
  ) {
    return this.library.list(user.id, query);
  }
}

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
import { favoriteSchema, type FavoriteDto } from "./dto/favorites.dto";
import { FavoritesService } from "./favorites.service";

@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(favoriteSchema)) dto: FavoriteDto,
  ) {
    return this.favorites.add(user.id, dto.animeId);
  }

  @Delete(":animeId")
  remove(
    @CurrentUser() user: AuthUser,
    @Param("animeId") animeId: string,
  ) {
    return this.favorites.remove(user.id, Number(animeId));
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.favorites.list(user.id, query);
  }
}

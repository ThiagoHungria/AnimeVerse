import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "./common/cache/cache.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { AnimeModule } from "./modules/anime/anime.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { HistoryModule } from "./modules/history/history.module";
import { RecommendationModule } from "./modules/recommendation/recommendation.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UserModule,
    AnimeModule,
    FavoritesModule,
    HistoryModule,
    RecommendationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

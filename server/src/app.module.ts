import { Module, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "./common/cache/cache.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { AnimeModule } from "./modules/anime/anime.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { HistoryModule } from "./modules/history/history.module";
import { LibraryModule } from "./modules/library/library.module";
import { RecommendationModule } from "./modules/recommendation/recommendation.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60_000,
          limit: 200,
        },
      ],
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UserModule,
    AnimeModule,
    FavoritesModule,
    HistoryModule,
    LibraryModule,
    RecommendationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

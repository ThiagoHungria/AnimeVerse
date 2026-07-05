import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`AnimeVerse API running on http://localhost:${port}`);
}

bootstrap();

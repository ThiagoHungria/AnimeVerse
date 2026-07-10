import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  logger.log({
    event: "server_started",
    port,
    corsOrigins: origins,
  });
}

bootstrap();

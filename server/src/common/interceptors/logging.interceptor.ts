import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { sanitizeForLog } from "../utils/sanitize-log";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const payload = sanitizeForLog({
            event: "request",
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          });
          this.logger.log(payload);
        },
      }),
    );
  }
}

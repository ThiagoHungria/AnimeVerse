import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ThrottlerException } from "@nestjs/throttler";
import { sanitizeForLog } from "../utils/sanitize-log";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolveException(exception);

    const logPayload = sanitizeForLog({
      event: "exception",
      method: request.method,
      path: request.url,
      statusCode,
      message,
    });

    if (statusCode >= 500) {
      this.logger.error(logPayload);
    } else {
      this.logger.warn(logPayload);
    }

    response.status(statusCode).json({ message, statusCode });
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
  } {
    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many requests",
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        return { statusCode, message: res };
      }

      if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;
        const raw = obj.message;

        if (Array.isArray(raw)) {
          return { statusCode, message: raw.join(", ") };
        }

        if (typeof raw === "string") {
          return { statusCode, message: raw };
        }
      }

      return { statusCode, message: exception.message };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    };
  }
}

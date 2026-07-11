import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, { value: string; expiresAt: number }>();
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) return;

    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // Don't queue commands while disconnected — fail fast to the memory path.
      enableOfflineQueue: false,
      // Never loop reconnect attempts: one failure disables Redis for the
      // process, so a missing Redis can't spam ECONNREFUSED forever.
      retryStrategy: () => null,
    });

    // A registered 'error' handler is what prevents ioredis' EventEmitter from
    // throwing "Unhandled error event" and crashing the process. On the first
    // error we quietly switch to the in-memory fallback.
    client.on("error", (err: Error) => {
      this.fallbackToMemory(client, `Redis error — using in-memory cache: ${err.message}`);
    });

    this.redis = client;
    client
      .connect()
      .catch(() => this.fallbackToMemory(client, "Redis unavailable — using in-memory cache"));
  }

  /**
   * Disable Redis and switch to the in-memory Map. Idempotent: only the first
   * call logs and disconnects, so repeated error events stay silent.
   */
  private fallbackToMemory(client: Redis, reason: string): void {
    if (!this.redis) return;
    this.redis = null;
    this.logger.warn(reason);
    try {
      client.disconnect();
    } catch {
      /* already closing */
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        // Redis went down mid-session: degrade to a cache miss so the caller
        // recomputes instead of the request failing.
        this.logger.warn(`Redis get failed for "${key}" — treating as miss`);
        return null;
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis) {
      try {
        await this.redis.set(key, raw, "EX", ttlSeconds);
      } catch {
        // Best-effort write: a failed cache set must never break the request.
        this.logger.warn(`Redis set failed for "${key}" — skipping cache write`);
      }
      return;
    }
    this.memory.set(key, {
      value: raw,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        this.logger.warn(`Redis del failed for "${key}" — skipping`);
      }
      return;
    }
    this.memory.delete(key);
  }
}

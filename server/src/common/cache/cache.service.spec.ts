/**
 * Specs for CacheService (FASE 2.2-I.5 — Redis failure hardening).
 *
 * Covers both runtime modes and the offline-Redis resilience path:
 *  - Redis connects           → external client is used.
 *  - Redis fails to connect    → disconnect + silent in-memory fallback.
 *  - Redis emits an error      → handled (no unhandled error event), fallback.
 *  - REDIS_URL absent          → in-memory Map fallback.
 *
 * ioredis is mocked with a single controllable fake instance so we can drive
 * connect success/failure and error events deterministically.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => {
  const store = new Map<string, string>();
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  const state = { connectReject: false, disconnected: false };
  return {
    store,
    handlers,
    state,
    on: vi.fn((event: string, cb: (...a: unknown[]) => void) => {
      (handlers[event] ??= []).push(cb);
    }),
    emit(event: string, ...args: unknown[]) {
      (handlers[event] ?? []).forEach((cb) => cb(...args));
    },
    connect: vi.fn(async () => {
      if (state.connectReject) throw new Error("connect ECONNREFUSED");
    }),
    disconnect: vi.fn(() => {
      state.disconnected = true;
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    quit: vi.fn(async () => undefined),
    reset() {
      store.clear();
      for (const k of Object.keys(handlers)) delete handlers[k];
      state.connectReject = false;
      state.disconnected = false;
      for (const m of [
        this.on,
        this.connect,
        this.disconnect,
        this.get,
        this.set,
        this.del,
        this.quit,
      ]) {
        m.mockClear();
      }
    },
  };
});

vi.mock("ioredis", () => ({ default: vi.fn(() => redis) }));

import { CacheService } from "./cache.service";
import type { ConfigService } from "@nestjs/config";

function configWith(url?: string): ConfigService {
  return {
    get: (key: string) => (key === "REDIS_URL" ? url : undefined),
  } as unknown as ConfigService;
}

/** Flush pending microtasks so the constructor's connect().catch settles. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("CacheService", () => {
  beforeEach(() => redis.reset());

  describe("Redis connects correctly", () => {
    it("routes get/set/del through the Redis client", async () => {
      const cache = new CacheService(configWith("redis://localhost:6379"));
      await flush();

      await cache.set("reco:u1", { ids: [1, 2] }, 60);
      expect(redis.set).toHaveBeenCalledWith(
        "reco:u1",
        JSON.stringify({ ids: [1, 2] }),
        "EX",
        60,
      );
      expect(await cache.get("reco:u1")).toEqual({ ids: [1, 2] });

      await cache.del("reco:u1");
      expect(redis.del).toHaveBeenCalledWith("reco:u1");
      expect(await cache.get("reco:u1")).toBeNull();
      // Healthy Redis is never torn down.
      expect(redis.disconnect).not.toHaveBeenCalled();
    });

    it("registers an error handler to avoid unhandled error events", async () => {
      new CacheService(configWith("redis://localhost:6379"));
      await flush();
      expect(redis.on).toHaveBeenCalledWith("error", expect.any(Function));
    });
  });

  describe("Redis fails to connect", () => {
    it("disconnects and falls back to memory (get/set/del keep working)", async () => {
      redis.state.connectReject = true;
      const cache = new CacheService(configWith("redis://localhost:6379"));
      await flush();

      expect(redis.disconnect).toHaveBeenCalled();

      await expect(cache.set("reco:mem", { ids: [9] }, 60)).resolves.toBeUndefined();
      expect(await cache.get("reco:mem")).toEqual({ ids: [9] });
      // Once disabled, the Redis client is no longer touched.
      expect(redis.set).not.toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();

      await cache.del("reco:mem");
      expect(await cache.get("reco:mem")).toBeNull();
    });
  });

  describe("Redis emits ECONNREFUSED at runtime", () => {
    it("handles the error event without throwing and falls back to memory", async () => {
      const cache = new CacheService(configWith("redis://localhost:6379"));
      await flush();

      // Simulate ioredis surfacing a connection error after startup.
      expect(() =>
        redis.emit("error", new Error("connect ECONNREFUSED 127.0.0.1:6379")),
      ).not.toThrow();
      expect(redis.disconnect).toHaveBeenCalled();

      await cache.set("reco:after", { ids: [3] }, 60);
      expect(await cache.get("reco:after")).toEqual({ ids: [3] });
      // No further Redis writes after the fallback kicked in.
      expect(redis.set).not.toHaveBeenCalled();
    });

    it("is idempotent across repeated error events", async () => {
      new CacheService(configWith("redis://localhost:6379"));
      await flush();

      redis.emit("error", new Error("ECONNREFUSED"));
      const afterFirst = redis.disconnect.mock.calls.length;
      redis.emit("error", new Error("ECONNREFUSED again"));

      // Subsequent errors don't re-disconnect once already disabled.
      expect(afterFirst).toBe(1);
      expect(redis.disconnect.mock.calls.length).toBe(1);
    });
  });

  describe("without REDIS_URL (in-memory fallback)", () => {
    it("stores and retrieves values without constructing Redis", async () => {
      const cache = new CacheService(configWith(undefined));

      await cache.set("reco:mem", { ids: [9] }, 60);
      expect(await cache.get("reco:mem")).toEqual({ ids: [9] });
      expect(redis.set).not.toHaveBeenCalled();
      expect(redis.get).not.toHaveBeenCalled();

      await cache.del("reco:mem");
      expect(await cache.get("reco:mem")).toBeNull();
    });

    it("expires entries after their TTL", async () => {
      vi.useFakeTimers();
      try {
        const cache = new CacheService(configWith(undefined));
        await cache.set("reco:ttl", { ids: [1] }, 1);
        expect(await cache.get("reco:ttl")).not.toBeNull();

        vi.advanceTimersByTime(1500);
        expect(await cache.get("reco:ttl")).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

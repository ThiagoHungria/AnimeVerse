/**
 * Specs for RecommendationController ownership (IDOR) protection (FASE 2.2-G.1).
 *
 * The guard is applied at the framework layer; these unit tests exercise the
 * in-handler ownership check for both the default and taste endpoints, using a
 * stubbed engine so no DB/cache/Jikan is touched.
 */

import { describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { RecommendationController } from "./recommendation.controller";
import type { RecommendationEngineService } from "./recommendation.service";
import type { SmartFeedEngineService } from "./smart-feed-engine.service";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

function makeController(
  overrides: Partial<RecommendationEngineService> = {},
  smartFeedOverrides: Partial<SmartFeedEngineService> = {},
) {
  const engine = {
    getForUser: vi.fn(async () => []),
    getTasteForUser: vi.fn(async () => []),
    ...overrides,
  } as unknown as RecommendationEngineService;
  const smartFeeds = {
    getFeedsForUser: vi.fn(async () => []),
    ...smartFeedOverrides,
  } as unknown as SmartFeedEngineService;
  return {
    controller: new RecommendationController(engine, smartFeeds),
    engine,
    smartFeeds,
  };
}

const user: AuthUser = { id: "user-1" } as AuthUser;

describe("RecommendationController — getTasteForUser", () => {
  it("returns the engine ranking for the owner", async () => {
    const taste = [{ malId: 2 }];
    const { controller, engine } = makeController({
      getTasteForUser: vi.fn(async () => taste as never),
    });

    await expect(controller.getTasteForUser(user, "user-1")).resolves.toBe(
      taste,
    );
    expect(engine.getTasteForUser).toHaveBeenCalledWith("user-1");
  });

  it("rejects access to another user's taste feed (IDOR)", () => {
    const { controller, engine } = makeController();

    expect(() => controller.getTasteForUser(user, "user-2")).toThrow(
      ForbiddenException,
    );
    expect(engine.getTasteForUser).not.toHaveBeenCalled();
  });
});

describe("RecommendationController — getForUser", () => {
  it("rejects access to another user's default feed (IDOR)", () => {
    const { controller, engine } = makeController();

    expect(() => controller.getForUser(user, "user-2")).toThrow(
      ForbiddenException,
    );
    expect(engine.getForUser).not.toHaveBeenCalled();
  });
});

describe("RecommendationController — getFeedsForUser", () => {
  it("returns the contextual sections for the owner", async () => {
    const sections = [{ id: "because-watched" }];
    const { controller, smartFeeds } = makeController(
      {},
      { getFeedsForUser: vi.fn(async () => sections as never) },
    );

    await expect(controller.getFeedsForUser(user, "user-1")).resolves.toBe(
      sections,
    );
    expect(smartFeeds.getFeedsForUser).toHaveBeenCalledWith("user-1");
  });

  it("rejects access to another user's contextual feeds (IDOR)", () => {
    const { controller, smartFeeds } = makeController();

    expect(() => controller.getFeedsForUser(user, "user-2")).toThrow(
      ForbiddenException,
    );
    expect(smartFeeds.getFeedsForUser).not.toHaveBeenCalled();
  });
});

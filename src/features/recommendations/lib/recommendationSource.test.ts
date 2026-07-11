import { afterEach, describe, expect, it } from "vitest";
import {
  getRecoSource,
  isBackendRecoEnabled,
  selectRecommended,
  selectTasteBased,
  selectSmartFeeds,
  type RecommendationFeedResult,
  type SmartFeed,
  type SmartFeedResult,
  type TasteFeedResult,
} from "./recommendationSource";
import type { AnimeSummary } from "@/types";

function anime(malId: number, source: "client" | "backend"): AnimeSummary {
  return {
    id: String(malId),
    malId,
    title: `${source}-${malId}`,
    description: "",
    image: "",
    banner: "",
    rating: 8,
    genres: [],
    themes: [],
    demographics: [],
    smartTags: [],
    studios: [],
    status: "unknown",
    statusLabel: "",
    episodeCount: 0,
    source: "jikan",
  };
}

const clientFeed: RecommendationFeedResult = {
  recommendations: [anime(1, "client")],
  isLoading: false,
  personalized: true,
};

const backendFeed: RecommendationFeedResult = {
  recommendations: [anime(2, "backend")],
  isLoading: false,
  personalized: true,
};

const emptyBackend: RecommendationFeedResult = {
  recommendations: [],
  isLoading: false,
  personalized: false,
};

describe("getRecoSource", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_RECO_SOURCE;
  });

  it("defaults to client when the flag is unset", () => {
    delete process.env.NEXT_PUBLIC_RECO_SOURCE;
    expect(getRecoSource()).toBe("client");
  });

  it("returns backend only for the exact 'backend' value", () => {
    process.env.NEXT_PUBLIC_RECO_SOURCE = "backend";
    expect(getRecoSource()).toBe("backend");
    process.env.NEXT_PUBLIC_RECO_SOURCE = "anything-else";
    expect(getRecoSource()).toBe("client");
  });
});

describe("isBackendRecoEnabled (sync gating)", () => {
  const base = {
    source: "backend" as const,
    isAuthenticated: true,
    userId: "user-1",
    isSyncCompleted: true,
  };

  it("blocks the query before the sync completes", () => {
    expect(isBackendRecoEnabled({ ...base, isSyncCompleted: false })).toBe(
      false,
    );
  });

  it("releases the query once the sync has completed", () => {
    expect(isBackendRecoEnabled({ ...base, isSyncCompleted: true })).toBe(true);
  });

  it("stays blocked for anonymous users regardless of sync state", () => {
    expect(
      isBackendRecoEnabled({
        ...base,
        isAuthenticated: false,
        isSyncCompleted: true,
      }),
    ).toBe(false);
  });

  it("stays blocked without a userId", () => {
    expect(isBackendRecoEnabled({ ...base, userId: undefined })).toBe(false);
    expect(isBackendRecoEnabled({ ...base, userId: null })).toBe(false);
  });

  it("stays blocked on the client flag even after sync", () => {
    expect(isBackendRecoEnabled({ ...base, source: "client" })).toBe(false);
  });
});

describe("selectRecommended", () => {
  it("uses the client engine when the flag is client (default behaviour)", () => {
    const result = selectRecommended({
      source: "client",
      isAuthenticated: true,
      backend: backendFeed,
      client: clientFeed,
    });
    expect(result).toBe(clientFeed);
  });

  it("uses the backend when flag=backend + authenticated + has data", () => {
    const result = selectRecommended({
      source: "backend",
      isAuthenticated: true,
      backend: backendFeed,
      client: clientFeed,
    });
    expect(result).toBe(backendFeed);
  });

  it("uses the client engine for anonymous users even on flag=backend", () => {
    const result = selectRecommended({
      source: "backend",
      isAuthenticated: false,
      backend: backendFeed,
      client: clientFeed,
    });
    expect(result).toBe(clientFeed);
  });

  it("falls back to the client engine when the backend is empty", () => {
    const result = selectRecommended({
      source: "backend",
      isAuthenticated: true,
      backend: emptyBackend,
      client: clientFeed,
    });
    expect(result).toBe(clientFeed);
  });
});

describe("selectTasteBased", () => {
  const clientTaste: TasteFeedResult = {
    recommendations: [anime(1, "client")],
    isLoading: false,
    hasTaste: true,
  };
  const backendTaste: TasteFeedResult = {
    recommendations: [anime(2, "backend")],
    isLoading: false,
    hasTaste: true,
  };
  const emptyBackendTaste: TasteFeedResult = {
    recommendations: [],
    isLoading: false,
    hasTaste: false,
  };

  it("keeps client behaviour when the flag is client (default)", () => {
    const result = selectTasteBased({
      source: "client",
      isAuthenticated: true,
      backend: backendTaste,
      client: clientTaste,
    });
    expect(result).toBe(clientTaste);
  });

  it("uses the backend when flag=backend + authenticated + has data", () => {
    const result = selectTasteBased({
      source: "backend",
      isAuthenticated: true,
      backend: backendTaste,
      client: clientTaste,
    });
    expect(result).toBe(backendTaste);
  });

  it("uses the client engine for anonymous users even on flag=backend", () => {
    const result = selectTasteBased({
      source: "backend",
      isAuthenticated: false,
      backend: backendTaste,
      client: clientTaste,
    });
    expect(result).toBe(clientTaste);
  });

  it("falls back to the client engine when the backend is empty or errored", () => {
    const result = selectTasteBased({
      source: "backend",
      isAuthenticated: true,
      backend: emptyBackendTaste,
      client: clientTaste,
    });
    expect(result).toBe(clientTaste);
  });
});

describe("selectSmartFeeds", () => {
  function feed(id: string): SmartFeed {
    return { id, title: id, eyebrow: "", animes: [] };
  }

  const clientResult: SmartFeedResult = {
    feeds: [
      feed("because-watched"),
      feed("like-favorite"),
      feed("probably"),
      feed("high-obscure"),
    ],
    isLoading: false,
  };

  const backendResult: SmartFeedResult = {
    feeds: [feed("because-watched"), feed("like-favorite")],
    isLoading: false,
  };

  const emptyBackend: SmartFeedResult = { feeds: [], isLoading: false };

  it("keeps the full client engine when the flag is client (default)", () => {
    const result = selectSmartFeeds({
      source: "client",
      isAuthenticated: true,
      backend: backendResult,
      client: clientResult,
    });
    expect(result).toBe(clientResult);
  });

  it("uses backend anchored sections and appends client-only sections", () => {
    const result = selectSmartFeeds({
      source: "backend",
      isAuthenticated: true,
      backend: backendResult,
      client: clientResult,
    });
    // Backend contextual sections first, then client probably/high-obscure.
    expect(result.feeds.map((f) => f.id)).toEqual([
      "because-watched",
      "like-favorite",
      "probably",
      "high-obscure",
    ]);
    // The anchored sections come from the backend result.
    expect(result.feeds[0]).toBe(backendResult.feeds[0]);
    expect(result.feeds[1]).toBe(backendResult.feeds[1]);
  });

  it("uses the client engine for anonymous users even on flag=backend", () => {
    const result = selectSmartFeeds({
      source: "backend",
      isAuthenticated: false,
      backend: backendResult,
      client: clientResult,
    });
    expect(result).toBe(clientResult);
  });

  it("falls back to the client engine when the backend has no sections", () => {
    const result = selectSmartFeeds({
      source: "backend",
      isAuthenticated: true,
      backend: emptyBackend,
      client: clientResult,
    });
    expect(result).toBe(clientResult);
  });
});

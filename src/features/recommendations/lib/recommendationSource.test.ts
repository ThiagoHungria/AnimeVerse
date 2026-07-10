import { afterEach, describe, expect, it } from "vitest";
import {
  getRecoSource,
  selectRecommended,
  type RecommendationFeedResult,
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

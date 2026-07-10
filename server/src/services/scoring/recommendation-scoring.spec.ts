/**
 * Specs for the isolated scoring engine (FASE 2.2-B2).
 *
 * Covers structure/wiring AND the required scoring behaviour:
 *   - strong watch history raises the score
 *   - matching genres raise the score
 *   - seen/favorited anime are excluded
 *   - weights renormalize correctly (ratings held out)
 *   - cold start still ranks (quality/popularity/trends proxy)
 *   - ratings do not affect the score while their weight is 0
 *
 * The engine is deterministic (recency is relative to the newest history entry),
 * so no clock/mocking is needed.
 */

import { describe, expect, it } from "vitest";
import { RecommendationScoringService } from "./recommendation-scoring.service";
import {
  DEFAULT_SCORING_WEIGHTS,
  type CandidateAnime,
  type UserSignals,
} from "./scoring.types";

function makeSignals(overrides: Partial<UserSignals> = {}): UserSignals {
  return {
    tasteProfile: {},
    favoriteGenres: [],
    historyGenres: [],
    history: [],
    ratings: {},
    seenAnimeIds: [],
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<CandidateAnime> = {}): CandidateAnime {
  return {
    id: 1,
    title: "Test Anime",
    genres: ["Action"],
    themes: [],
    score: 8,
    popularity: 100,
    ...overrides,
  };
}

function byId(results: { anime: CandidateAnime }[]): number[] {
  return results.map((r) => r.anime.id);
}

describe("RecommendationScoringService — structure", () => {
  it("can be instantiated", () => {
    expect(new RecommendationScoringService()).toBeInstanceOf(
      RecommendationScoringService,
    );
  });

  it("exposes the public API", () => {
    const service = new RecommendationScoringService();
    expect(typeof service.score).toBe("function");
    expect(typeof service.resolveWeights).toBe("function");
    expect(typeof service.normalizeWeights).toBe("function");
  });

  it("returns an empty list when there are no candidates", () => {
    const service = new RecommendationScoringService();
    expect(service.score(makeSignals(), [])).toEqual([]);
  });

  it("returns the ScoredRecommendation output shape", () => {
    const service = new RecommendationScoringService();
    const [result] = service.score(makeSignals(), [makeCandidate()]);

    expect(result.anime.id).toBe(1);
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        history: expect.any(Number),
        genres: expect.any(Number),
        ratings: expect.any(Number),
        similarUsers: expect.any(Number),
        trends: expect.any(Number),
      }),
    );
  });

  it("keeps every final score within [0, 1]", () => {
    const service = new RecommendationScoringService();
    const results = service.score(
      makeSignals({
        tasteProfile: { Action: 10 },
        history: [
          { animeId: 9, genres: ["Action"], progress: 12, duration: 12 },
        ],
      }),
      [makeCandidate({ id: 1, trending: true, score: 10, popularity: 1 })],
    );
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("RecommendationScoringService — history component", () => {
  it("gives a higher score to anime matching strong, recent history", () => {
    const service = new RecommendationScoringService();
    const now = Date.now();

    const signals = makeSignals({
      history: [
        // Heavily watched, very recent Action.
        {
          animeId: 100,
          genres: ["Action"],
          progress: 24,
          duration: 24,
          updatedAt: new Date(now),
        },
        // Barely watched, old Romance.
        {
          animeId: 101,
          genres: ["Romance"],
          progress: 1,
          duration: 24,
          updatedAt: new Date(now - 120 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    const [action] = service.score(signals, [makeCandidate({ id: 1, genres: ["Action"] })]);
    const [romance] = service.score(signals, [makeCandidate({ id: 2, genres: ["Romance"] })]);

    expect(action.breakdown.history).toBeGreaterThan(romance.breakdown.history);
    expect(action.score).toBeGreaterThan(romance.score);
  });

  it("ranks a history-aligned candidate first", () => {
    const service = new RecommendationScoringService();
    const signals = makeSignals({
      history: [
        {
          animeId: 100,
          genres: ["Action"],
          progress: 12,
          duration: 12,
          updatedAt: new Date(),
        },
      ],
    });
    const results = service.score(signals, [
      makeCandidate({ id: 2, genres: ["Slice of Life"], score: 8, popularity: 100 }),
      makeCandidate({ id: 1, genres: ["Action"], score: 8, popularity: 100 }),
    ]);
    expect(byId(results)[0]).toBe(1);
  });
});

describe("RecommendationScoringService — genre component", () => {
  it("raises the score when candidate genres match the taste profile", () => {
    const service = new RecommendationScoringService();
    const signals = makeSignals({ tasteProfile: { Action: 8, Adventure: 4 } });

    const [match] = service.score(signals, [makeCandidate({ id: 1, genres: ["Action"] })]);
    const [noMatch] = service.score(signals, [makeCandidate({ id: 2, genres: ["Horror"] })]);

    expect(match.breakdown.genres).toBeGreaterThan(noMatch.breakdown.genres);
    expect(match.score).toBeGreaterThan(noMatch.score);
  });

  it("reinforces favorite genres", () => {
    const service = new RecommendationScoringService();
    const signals = makeSignals({ favoriteGenres: ["Action"] });
    const [match] = service.score(signals, [makeCandidate({ genres: ["Action"] })]);
    expect(match.breakdown.genres).toBeGreaterThan(0);
  });
});

describe("RecommendationScoringService — exclusions", () => {
  it("excludes anime already seen (watched/favorited)", () => {
    const service = new RecommendationScoringService();
    const results = service.score(
      makeSignals({ seenAnimeIds: [1] }),
      [makeCandidate({ id: 1 }), makeCandidate({ id: 2 })],
    );
    expect(byId(results)).toEqual([2]);
  });

  it("can keep seen anime when excludeSeen is false", () => {
    const service = new RecommendationScoringService();
    const results = service.score(
      makeSignals({ seenAnimeIds: [1] }),
      [makeCandidate({ id: 1 }), makeCandidate({ id: 2 })],
      { excludeSeen: false },
    );
    expect(byId(results).sort()).toEqual([1, 2]);
  });

  it("respects the limit option", () => {
    const service = new RecommendationScoringService();
    const candidates = [
      makeCandidate({ id: 1 }),
      makeCandidate({ id: 2 }),
      makeCandidate({ id: 3 }),
    ];
    expect(service.score(makeSignals(), candidates, { limit: 2 })).toHaveLength(2);
  });
});

describe("RecommendationScoringService — weights", () => {
  it("renormalizes active weights to sum ~1", () => {
    const service = new RecommendationScoringService();
    const w = service.resolveWeights();
    const total = w.history + w.genres + w.ratings + w.similarUsers + w.trends;
    expect(total).toBeCloseTo(1, 5);
  });

  it("holds ratings at weight 0 in 2.2-B2", () => {
    expect(DEFAULT_SCORING_WEIGHTS.ratings).toBe(0);
    expect(new RecommendationScoringService().resolveWeights().ratings).toBe(0);
  });

  it("keeps the plan's default weight ratios (pre-normalization)", () => {
    expect(DEFAULT_SCORING_WEIGHTS).toEqual({
      history: 0.4,
      genres: 0.2,
      ratings: 0,
      similarUsers: 0.15,
      trends: 0.1,
    });
  });
});

describe("RecommendationScoringService — cold start", () => {
  it("still ranks candidates for a user with no signals", () => {
    const service = new RecommendationScoringService();
    const results = service.score(makeSignals(), [
      makeCandidate({ id: 1, score: 5, popularity: 5000 }),
      makeCandidate({ id: 2, score: 9, popularity: 10 }),
    ]);
    expect(results).toHaveLength(2);
    // Higher quality/popularity wins via the proxy.
    expect(byId(results)[0]).toBe(2);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("does not emit a 'similar_users' reason from the proxy", () => {
    const service = new RecommendationScoringService();
    const [result] = service.score(makeSignals(), [
      makeCandidate({ id: 1, score: 9, popularity: 10 }),
    ]);
    expect(result.reasons.some((r) => r.type === "similar_users")).toBe(false);
  });
});

describe("RecommendationScoringService — trends & ratings", () => {
  it("boosts trending anime via the trends component", () => {
    const service = new RecommendationScoringService();
    const [trending] = service.score(makeSignals(), [
      makeCandidate({ id: 1, trending: true }),
    ]);
    const [normal] = service.score(makeSignals(), [
      makeCandidate({ id: 2, trending: false }),
    ]);
    expect(trending.breakdown.trends).toBe(1);
    expect(normal.breakdown.trends).toBe(0);
    expect(trending.score).toBeGreaterThan(normal.score);
  });

  it("does not let ratings change the final score while weight is 0", () => {
    const service = new RecommendationScoringService();
    const candidate = makeCandidate({ id: 1 });

    const withoutRating = service.score(makeSignals(), [candidate]);
    const withRating = service.score(
      makeSignals({ ratings: { 1: 10 } }),
      [candidate],
    );

    // Ratings component is computed but its 0 weight keeps the score identical.
    expect(withRating[0].breakdown.ratings).toBe(1);
    expect(withRating[0].score).toBe(withoutRating[0].score);
  });
});

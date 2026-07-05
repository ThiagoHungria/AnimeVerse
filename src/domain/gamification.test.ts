import { describe, expect, it } from "vitest";
import {
  badgesToUnlock,
  levelFromXp,
  xpProgressInLevel,
} from "@/domain/gamification";
import { animeVerseScore, similarityScore } from "@/services/intelligenceEngine";
import type { AnimeSummary } from "@/types";

const baseAnime = (overrides: Partial<AnimeSummary> = {}): AnimeSummary => ({
  id: "1",
  malId: 1,
  title: "Test Anime",
  description: "",
  image: "",
  banner: "",
  rating: 8,
  genres: ["Action"],
  themes: [],
  demographics: [],
  episodeCount: 12,
  smartTags: [],
  source: "jikan",
  ...overrides,
});

describe("gamification", () => {
  it("computes level from XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(200)).toBe(2);
    expect(levelFromXp(450)).toBe(3);
  });

  it("tracks XP progress within level", () => {
    const p = xpProgressInLevel(250);
    expect(p.current).toBe(50);
    expect(p.percent).toBe(25);
  });

  it("unlocks first watch badge", () => {
    const ids = badgesToUnlock(
      {
        episodesWatched: 1,
        episodesCompleted: 0,
        favoritesAdded: 0,
        exploreSessions: 0,
      },
      0,
      0,
      [],
    );
    expect(ids).toContain("first_watch");
  });
});

describe("intelligenceEngine", () => {
  it("scores similar genres higher", () => {
    const a = baseAnime({ genres: ["Action", "Adventure"] });
    const b = baseAnime({ id: "2", genres: ["Action", "Fantasy"] });
    const c = baseAnime({ id: "3", genres: ["Romance", "Slice of Life"] });
    expect(similarityScore(a, b)).toBeGreaterThan(similarityScore(a, c));
  });

  it("ranks higher-rated anime better", () => {
    const high = animeVerseScore(
      baseAnime({ rating: 9.2, popularity: 1000 }),
    );
    const low = animeVerseScore(baseAnime({ rating: 6, popularity: 1000 }));
    expect(high).toBeGreaterThan(low);
  });
});

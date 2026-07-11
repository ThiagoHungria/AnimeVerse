import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnimeSummary } from "@/types";
import type { RecommendationReasonAwareAnime } from "@/features/recommendations/types";
import type { RecommendationReason } from "@/services/apiClient";

vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({ children, href }: { children: unknown; href?: unknown }) =>
      h("a", { href: typeof href === "string" ? href : "#" }, children as never),
  };
});

vi.mock("next/image", async () => {
  const { createElement: h } = await import("react");
  return {
    default: ({ src, alt }: { src?: string; alt?: string }) =>
      h("img", { src, alt }),
  };
});

vi.mock("framer-motion", async () => {
  const { createElement: h, forwardRef } = await import("react");
  const passthrough = () =>
    forwardRef(({ children }: { children?: unknown }, ref: never) =>
      h("div", { ref }, children as never),
    );
  const motion = new Proxy(
    {},
    { get: () => passthrough() },
  ) as Record<string, unknown>;
  return {
    motion,
    AnimatePresence: ({ children }: { children?: unknown }) => children,
    useMotionValue: (v: unknown) => ({ get: () => v, set: () => undefined }),
    useSpring: (v: unknown) => v,
    useTransform: () => 0,
    useInView: () => true,
  };
});

// Imported after mocks so the mocked modules are used.
const { AnimeCard } = await import("@/features/anime/components/AnimeCard");
const { AnimeCardPremium } = await import("@/components/AnimeCardPremium");
const { AnimeCarousel } = await import("@/features/anime/components/AnimeCarousel");
const { RecommendationSection } = await import(
  "@/components/RecommendationSection"
);

const LABEL = "Porque você assistiu Attack on Titan";

const reasons: RecommendationReason[] = [
  { type: "genre_similar", sourceTitle: "Attack on Titan", label: LABEL },
];

function summary(overrides: Partial<AnimeSummary> = {}): AnimeSummary {
  return {
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
    smartTags: [],
    studios: [],
    status: "ongoing",
    statusLabel: "Em lançamento",
    episodeCount: 12,
    source: "jikan",
    ...overrides,
  };
}

function withReasons(
  overrides: Partial<AnimeSummary> = {},
): RecommendationReasonAwareAnime {
  return { ...summary(overrides), reasons };
}

describe("AnimeCard reasons integration", () => {
  it("renders the reason chip when reasons are provided", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCard, { anime: summary(), reasons }),
    );
    expect(html).toContain(LABEL);
  });

  it("renders no chip when reasons are absent", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCard, { anime: summary() }),
    );
    expect(html).not.toContain(LABEL);
  });
});

describe("AnimeCardPremium reasons integration", () => {
  it("renders the reason chip when reasons are provided", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCardPremium, { anime: summary(), reasons }),
    );
    expect(html).toContain(LABEL);
  });

  it("renders no chip when reasons are absent", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCardPremium, { anime: summary() }),
    );
    expect(html).not.toContain(LABEL);
  });
});

describe("AnimeCarousel forwards reasons", () => {
  it("shows the chip for reason-aware animes", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCarousel, {
        title: "Recomendado para você",
        animes: [withReasons()],
      }),
    );
    expect(html).toContain(LABEL);
  });

  it("shows no chip for plain summaries (Trending/Popular)", () => {
    const html = renderToStaticMarkup(
      createElement(AnimeCarousel, {
        title: "Trending agora",
        animes: [summary(), summary({ id: "2", malId: 2 })],
      }),
    );
    expect(html).not.toContain(LABEL);
  });
});

describe("RecommendationSection forwards reasons", () => {
  it("shows the chip for reason-aware animes", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationSection, {
        title: "Porque você assistiu",
        animes: [withReasons()],
      }),
    );
    expect(html).toContain(LABEL);
  });

  it("shows no chip for plain summaries (Trending/Popular)", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationSection, {
        title: "Mais populares",
        animes: [summary(), summary({ id: "2", malId: 2 })],
      }),
    );
    expect(html).not.toContain(LABEL);
  });
});

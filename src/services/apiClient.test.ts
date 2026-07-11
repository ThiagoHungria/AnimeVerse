import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiClient,
  resetRefreshPromiseForTests,
  type TokenPair,
} from "./apiClient";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiClient auth refresh", () => {
  let client: ApiClient;
  let onTokensRefreshed: ReturnType<typeof vi.fn>;
  let onRefreshFailed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetRefreshPromiseForTests();
    client = new ApiClient();
    onTokensRefreshed = vi.fn<(tokens: TokenPair) => void>();
    onRefreshFailed = vi.fn();
    client.setAuthHandlers({
      getRefreshToken: () => "stored-refresh",
      onTokensRefreshed,
      onRefreshFailed,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("401 → refresh → retry 200", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", name: "Test" }));

    vi.stubGlobal("fetch", fetchMock);

    client.setAccessToken("expired-access");
    const result = await client.getProfile();

    expect(result).toEqual({ id: "user-1", name: "Test" });
    expect(onTokensRefreshed).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(onRefreshFailed).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/auth/refresh`);
    expect(fetchMock.mock.calls[2][0]).toBe(`${API_URL}/user/profile`);
  });

  it("multiple 401 → only 1 refresh", async () => {
    let refreshCalls = 0;

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        });
      }
      if (url.includes("/user/profile")) {
        if (client.getAccessToken() === "expired-access") {
          return jsonResponse({ message: "Unauthorized" }, 401);
        }
        return jsonResponse({ id: "user-1" });
      }
      return jsonResponse({});
    });

    vi.stubGlobal("fetch", fetchMock);

    client.setAccessToken("expired-access");
    const [a, b] = await Promise.all([client.getProfile(), client.getProfile()]);

    expect(a).toEqual({ id: "user-1" });
    expect(b).toEqual({ id: "user-1" });
    expect(refreshCalls).toBe(1);
    expect(onTokensRefreshed).toHaveBeenCalledTimes(1);
  });

  it("refresh returns 401 → onRefreshFailed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Invalid refresh token" }, 401));

    vi.stubGlobal("fetch", fetchMock);

    client.setAccessToken("expired-access");

    await expect(client.getProfile()).rejects.toEqual(
      expect.objectContaining({ statusCode: 401, message: "Unauthorized" }),
    );
    expect(onRefreshFailed).toHaveBeenCalledTimes(1);
    expect(onTokensRefreshed).not.toHaveBeenCalled();
  });

  it("refresh returns 500 → keeps session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Server error" }, 500));

    vi.stubGlobal("fetch", fetchMock);

    client.setAccessToken("expired-access");

    await expect(client.getProfile()).rejects.toEqual(
      expect.objectContaining({ statusCode: 401, message: "Unauthorized" }),
    );
    expect(onRefreshFailed).not.toHaveBeenCalled();
    expect(onTokensRefreshed).not.toHaveBeenCalled();
  });

  it("public request without token does not call refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));

    vi.stubGlobal("fetch", fetchMock);

    await expect(client.getTrending()).rejects.toEqual(
      expect.objectContaining({ statusCode: 401 }),
    );

    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/auth/refresh"),
      ),
    ).toBe(false);
    expect(onRefreshFailed).not.toHaveBeenCalled();
    expect(onTokensRefreshed).not.toHaveBeenCalled();
  });
});

describe("apiClient getRecommendations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns items carrying reasons, score and trending", async () => {
    const payload = [
      {
        id: "1",
        malId: 1,
        title: "Rec Anime",
        description: "",
        image: "img.png",
        banner: "banner.png",
        rating: 8.2,
        genres: ["Action"],
        themes: [],
        episodeCount: 24,
        source: "jikan",
        rank: 12,
        popularity: 40,
        status: "airing",
        type: "TV",
        score: 0.87,
        trending: true,
        reasons: [{ type: "genre_similar", label: "Combina com seus gêneros" }],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient();
    client.setAccessToken("access-token");
    const result = await client.getRecommendations("user-1");

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/recommendations/user-1`);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0.87);
    expect(result[0].trending).toBe(true);
    expect(result[0].reasons).toEqual([
      { type: "genre_similar", label: "Combina com seus gêneros" },
    ]);
  });
});

describe("apiClient getTasteRecommendations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the taste endpoint for the user", async () => {
    const payload = [
      {
        id: "2",
        malId: 2,
        title: "Taste Anime",
        description: "",
        image: "img.png",
        banner: "banner.png",
        rating: 7.5,
        genres: ["Romance"],
        themes: [],
        episodeCount: 12,
        source: "jikan",
        score: 0.72,
        reasons: [{ type: "genre_similar", label: "Combina com seu gosto" }],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient();
    client.setAccessToken("access-token");
    const result = await client.getTasteRecommendations("user-1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_URL}/recommendations/user-1/taste`,
    );
    expect(result).toHaveLength(1);
    expect(result[0].malId).toBe(2);
    expect(result[0].reasons).toEqual([
      { type: "genre_similar", label: "Combina com seu gosto" },
    ]);
  });
});

describe("apiClient getSmartFeeds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the feeds endpoint and returns contextual sections", async () => {
    const payload = [
      {
        id: "because-watched",
        title: "Porque você assistiu X",
        eyebrow: "Continuidade de gosto",
        source: { animeId: 100, title: "X" },
        items: [
          {
            id: "3",
            malId: 3,
            title: "Rec",
            description: "",
            image: "i.png",
            banner: "b.png",
            rating: 8,
            genres: ["Action"],
            themes: [],
            episodeCount: 12,
            source: "jikan",
            reasons: [
              {
                type: "genre_similar",
                sourceAnimeId: 100,
                sourceTitle: "X",
                label: "Porque você assistiu X",
              },
            ],
          },
        ],
      },
    ];

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient();
    client.setAccessToken("access-token");
    const result = await client.getSmartFeeds("user-1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_URL}/recommendations/user-1/feeds`,
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("because-watched");
    expect(result[0].source).toEqual({ animeId: 100, title: "X" });
    expect(result[0].items[0].reasons?.[0].sourceAnimeId).toBe(100);
  });
});

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

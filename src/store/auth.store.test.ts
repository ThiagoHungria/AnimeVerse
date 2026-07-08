import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "./auth.store";

const mockUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("auth.store updateTokens", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
    });

    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    apiClient.setAccessToken(null);
  });

  it("updateTokens preserves user and isAuthenticated", () => {
    useAuthStore.getState().login(mockUser, {
      accessToken: "old-access",
      refreshToken: "old-refresh",
    });

    useAuthStore.getState().updateTokens({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("new-access");
    expect(state.refreshToken).toBe("new-refresh");
    expect(apiClient.getAccessToken()).toBe("new-access");
  });
});

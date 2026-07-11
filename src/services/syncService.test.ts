import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { useSyncStore } from "@/store/sync.store";
import { syncUserData } from "@/services/syncService";

const emptyPage = { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } };

describe("syncUserData → isSyncCompleted gating (FASE 2.2-I.1)", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });

    useSyncStore.setState({ isSyncCompleted: false });
    useAuthStore.setState({
      user: {
        id: "user-1",
        name: "Test",
        email: "t@e.com",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      accessToken: "a",
      refreshToken: "r",
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    useSyncStore.setState({ isSyncCompleted: false });
  });

  it("keeps recommendations blocked until the sync runs", () => {
    // Fresh session: the flag is false, so isBackendRecoEnabled gates queries.
    expect(useSyncStore.getState().isSyncCompleted).toBe(false);
  });

  it("releases recommendations after a successful sync", async () => {
    vi.spyOn(apiClient, "getFavorites").mockResolvedValue(emptyPage as never);
    vi.spyOn(apiClient, "getHistory").mockResolvedValue(emptyPage as never);
    vi.spyOn(apiClient, "getLibrary").mockResolvedValue(emptyPage as never);

    await syncUserData();

    expect(useSyncStore.getState().isSyncCompleted).toBe(true);
  });

  it("does not lock the user permanently when the sync fails", async () => {
    vi.spyOn(apiClient, "getFavorites").mockRejectedValue(
      new Error("network down"),
    );
    vi.spyOn(apiClient, "getHistory").mockResolvedValue(emptyPage as never);
    vi.spyOn(apiClient, "getLibrary").mockResolvedValue(emptyPage as never);

    await expect(syncUserData()).rejects.toThrow("network down");

    // finally{} still flipped the flag → hooks fall back to the client engine
    // instead of hanging forever on disabled queries.
    expect(useSyncStore.getState().isSyncCompleted).toBe(true);
  });
});

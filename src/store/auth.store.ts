"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  apiClient,
  type AuthUser,
  type TokenPair,
} from "@/services/apiClient";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, tokens: TokenPair) => void;
  logout: () => Promise<void>;
  hydrateClient: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, tokens) => {
        apiClient.setAccessToken(tokens.accessToken);
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await apiClient.logout(refreshToken);
          } catch {
            /* non-fatal */
          }
        }
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hydrateClient: () => {
        const token = get().accessToken;
        if (token) apiClient.setAccessToken(token);
      },
    }),
    {
      name: "animeverse:auth",
      onRehydrateStorage: () => (state) => {
        state?.hydrateClient();
      },
    },
  ),
);

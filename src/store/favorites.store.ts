import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeSummary } from "@/types";

interface FavoritesState {
  /** Stored as full summaries so the Favorites page needs no network call. */
  items: AnimeSummary[];
  toggle: (anime: AnimeSummary) => void;
  add: (anime: AnimeSummary) => void;
  remove: (animeId: string) => void;
  isFavorite: (animeId: string) => boolean;
  clear: () => void;
  /** Replace all items (used after server sync merge). */
  replaceAll: (items: AnimeSummary[]) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (anime) =>
        set((state) =>
          state.items.some((a) => a.id === anime.id)
            ? { items: state.items.filter((a) => a.id !== anime.id) }
            : { items: [anime, ...state.items] },
        ),
      add: (anime) =>
        set((state) =>
          state.items.some((a) => a.id === anime.id)
            ? state
            : { items: [anime, ...state.items] },
        ),
      remove: (animeId) =>
        set((state) => ({
          items: state.items.filter((a) => a.id !== animeId),
        })),
      isFavorite: (animeId) => get().items.some((a) => a.id === animeId),
      clear: () => set({ items: [] }),
      replaceAll: (items) => set({ items }),
    }),
    { name: "animeverse:favorites" },
  ),
);

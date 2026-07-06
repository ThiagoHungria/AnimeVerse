import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeSummary } from "@/types";
import { syncLibraryAction } from "@/services/syncService";

export type LibraryList = "watching" | "completed" | "planned";

interface LibraryState {
  watching: AnimeSummary[];
  completed: AnimeSummary[];
  planned: AnimeSummary[];
  addTo: (list: LibraryList, anime: AnimeSummary) => void;
  removeFrom: (list: LibraryList, animeId: string) => void;
  moveTo: (
    from: LibraryList,
    to: LibraryList,
    anime: AnimeSummary,
  ) => void;
  isIn: (list: LibraryList, animeId: string) => boolean;
  replaceAll: (data: {
    watching: AnimeSummary[];
    completed: AnimeSummary[];
    planned: AnimeSummary[];
  }) => void;
}

function upsert(list: AnimeSummary[], anime: AnimeSummary): AnimeSummary[] {
  if (list.some((a) => a.id === anime.id)) return list;
  return [anime, ...list];
}

function removeFromAll(
  state: Pick<LibraryState, "watching" | "completed" | "planned">,
  animeId: string,
) {
  return {
    watching: state.watching.filter((a) => a.id !== animeId),
    completed: state.completed.filter((a) => a.id !== animeId),
    planned: state.planned.filter((a) => a.id !== animeId),
  };
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      watching: [],
      completed: [],
      planned: [],

      addTo: (list, anime) => {
        set((state) => {
          const cleared = removeFromAll(state, anime.id);
          return {
            ...cleared,
            [list]: upsert(cleared[list], anime),
          };
        });
        syncLibraryAction(anime, list);
      },

      removeFrom: (list, animeId) => {
        set((state) => ({
          ...state,
          [list]: state[list].filter((a) => a.id !== animeId),
        }));
        syncLibraryAction(null, list, animeId);
      },

      moveTo: (from, to, anime) => {
        set((state) => {
          const cleared = removeFromAll(state, anime.id);
          return {
            ...cleared,
            [to]: upsert(cleared[to], anime),
          };
        });
        syncLibraryAction(anime, to);
      },

      isIn: (list, animeId) => get()[list].some((a) => a.id === animeId),

      replaceAll: (data) => set(data),
    }),
    { name: "animeverse:library" },
  ),
);

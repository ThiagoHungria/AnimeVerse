import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryEntry } from "@/types";

const MAX_ENTRIES = 50;

interface HistoryState {
  entries: HistoryEntry[];
  /** Upsert a watch entry (keyed by anime+episode). Keeps list newest-first. */
  record: (entry: HistoryEntry) => void;
  /** Update playback progress for an already-recorded episode. */
  updateProgress: (
    animeId: string,
    episodeId: string,
    progress: number,
    duration: number,
  ) => void;
  getForAnime: (animeId: string) => HistoryEntry | undefined;
  remove: (animeId: string, episodeId: string) => void;
  clear: () => void;
  /** Replace all entries (used after server sync merge). */
  replaceAll: (entries: HistoryEntry[]) => void;
}

const key = (animeId: string, episodeId: string) => `${animeId}::${episodeId}`;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      record: (entry) =>
        set((state) => {
          const id = key(entry.animeId, entry.episodeId);
          const rest = state.entries.filter(
            (e) => key(e.animeId, e.episodeId) !== id,
          );
          return {
            entries: [{ ...entry, updatedAt: Date.now() }, ...rest].slice(
              0,
              MAX_ENTRIES,
            ),
          };
        }),
      updateProgress: (animeId, episodeId, progress, duration) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            key(e.animeId, e.episodeId) === key(animeId, episodeId)
              ? { ...e, progress, duration, updatedAt: Date.now() }
              : e,
          ),
        })),
      getForAnime: (animeId) =>
        get()
          .entries.filter((e) => e.animeId === animeId)
          .sort((a, b) => b.updatedAt - a.updatedAt)[0],
      remove: (animeId, episodeId) =>
        set((state) => ({
          entries: state.entries.filter(
            (e) => key(e.animeId, e.episodeId) !== key(animeId, episodeId),
          ),
        })),
      clear: () => set({ entries: [] }),
      replaceAll: (entries) => set({ entries }),
    }),
    { name: "animeverse:history" },
  ),
);

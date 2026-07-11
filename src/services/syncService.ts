/**
 * Bidirectional sync between LocalStorage (Zustand) and the NestJS backend.
 *
 * Strategy:
 *  1. On login / app mount (authenticated): push local → server, then pull + merge.
 *  2. On each favorite/history action while logged in: fire-and-forget API call.
 *
 * Only numeric MAL ids are synced (mock slugs are skipped).
 */

import {
  apiClient,
  type HistoryEntryDto,
  type LibraryEntryDto,
} from "./apiClient";
import { dtoToSummary } from "./dtoMappers";
import { useAuthStore } from "@/store/auth.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHistoryStore } from "@/store/history.store";
import { useLibraryStore, type LibraryList } from "@/store/library.store";
import { useSyncStore } from "@/store/sync.store";
import type { AnimeSummary, HistoryEntry } from "@/types";

const isMalId = (id: string) => /^\d+$/.test(id);

let syncing = false;

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

/** Full sync: push local data up, then pull + merge from server. */
export async function syncUserData(): Promise<void> {
  if (!isAuthenticated() || syncing) return;
  syncing = true;
  try {
    await pushLocalToServer();
    await pullAndMerge();
  } finally {
    syncing = false;
    // Unblock backend recommendation queries whether the sync succeeded or
    // failed — a failed sync must never permanently lock the user out; the
    // reco hooks simply fall back to the client engine when the API errors.
    useSyncStore.getState().setSyncCompleted(true);
  }
}

async function pushLocalToServer(): Promise<void> {
  const favorites = useFavoritesStore.getState().items;
  const history = useHistoryStore.getState().entries;

  await Promise.allSettled(
    favorites
      .filter((a) => isMalId(a.id))
      .map((a) => apiClient.addFavorite(Number(a.id))),
  );

  await Promise.allSettled(
    history
      .filter((e) => isMalId(e.animeId))
      .map((e) =>
        apiClient.recordHistory({
          animeId: Number(e.animeId),
          episodeId: e.episodeId,
          episodeNumber: e.episodeNumber,
          episodeTitle: e.episodeTitle,
          progress: e.progress,
          duration: e.duration,
        }),
      ),
  );

  const library = useLibraryStore.getState();
  const libraryEntries: { anime: AnimeSummary; list: LibraryList }[] = [
    ...library.watching.map((anime) => ({ anime, list: "watching" as const })),
    ...library.completed.map((anime) => ({ anime, list: "completed" as const })),
    ...library.planned.map((anime) => ({ anime, list: "planned" as const })),
  ];
  await Promise.allSettled(
    libraryEntries
      .filter((e) => isMalId(e.anime.id))
      .map((e) => apiClient.upsertLibrary(Number(e.anime.id), e.list)),
  );
}

async function pullAndMerge(): Promise<void> {
  const [favRes, histRes, libRes] = await Promise.all([
    apiClient.getFavorites(1),
    apiClient.getHistory(1),
    apiClient.getLibrary(1).catch(() => ({
      data: [] as LibraryEntryDto[],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    })),
  ]);

  const remoteFavs = favRes.data.map(dtoToSummary);
  const localFavs = useFavoritesStore.getState().items;
  useFavoritesStore.getState().replaceAll(mergeFavorites(localFavs, remoteFavs));

  const remoteHist = histRes.data.map(dtoToHistory);
  const localHist = useHistoryStore.getState().entries;
  useHistoryStore.getState().replaceAll(mergeHistory(localHist, remoteHist));

  const remoteLib = mergeLibraryEntries(libRes.data);
  const localLib = useLibraryStore.getState();
  useLibraryStore.getState().replaceAll(mergeLibrary(localLib, remoteLib));
}

function mergeFavorites(
  local: AnimeSummary[],
  remote: AnimeSummary[],
): AnimeSummary[] {
  const map = new Map<string, AnimeSummary>();
  for (const a of local) map.set(a.id, a);
  for (const a of remote) map.set(a.id, a); // remote metadata wins
  return [...map.values()];
}

function mergeHistory(
  local: HistoryEntry[],
  remote: HistoryEntry[],
): HistoryEntry[] {
  const map = new Map<string, HistoryEntry>();
  const k = (e: HistoryEntry) => `${e.animeId}::${e.episodeId}`;
  for (const e of local) map.set(k(e), e);
  for (const e of remote) {
    const key = k(e);
    const existing = map.get(key);
    if (!existing || e.updatedAt > existing.updatedAt) map.set(key, e);
  }
  return [...map.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 50);
}

function dtoToHistory(d: HistoryEntryDto): HistoryEntry {
  return {
    animeId: d.animeId,
    episodeId: d.episodeId,
    animeTitle: d.animeTitle,
    animeImage: d.animeImage,
    episodeNumber: d.episodeNumber,
    episodeTitle: d.episodeTitle,
    progress: d.progress,
    duration: d.duration,
    updatedAt: d.updatedAt,
  };
}

/** Fire-and-forget: sync a single favorite add/remove while logged in. */
export function syncFavoriteAction(
  anime: AnimeSummary,
  adding: boolean,
): void {
  if (!isAuthenticated() || !isMalId(anime.id)) return;
  const id = Number(anime.id);
  const call = adding
    ? apiClient.addFavorite(id)
    : apiClient.removeFavorite(id);
  void call.catch(() => undefined);
}

/** Fire-and-forget: sync watch progress while logged in. */
export function syncHistoryAction(entry: HistoryEntry): void {
  if (!isAuthenticated() || !isMalId(entry.animeId)) return;
  void apiClient
    .recordHistory({
      animeId: Number(entry.animeId),
      episodeId: entry.episodeId,
      episodeNumber: entry.episodeNumber,
      episodeTitle: entry.episodeTitle,
      progress: entry.progress,
      duration: entry.duration,
    })
    .catch(() => undefined);
}

function mergeLibraryEntries(entries: LibraryEntryDto[]) {
  const result: {
    watching: AnimeSummary[];
    completed: AnimeSummary[];
    planned: AnimeSummary[];
  } = { watching: [], completed: [], planned: [] };
  for (const e of entries) {
    const anime = dtoToSummary(e.anime);
    if (e.list === "watching") result.watching.push(anime);
    else if (e.list === "completed") result.completed.push(anime);
    else if (e.list === "planned") result.planned.push(anime);
  }
  return result;
}

function mergeLibrary(
  local: { watching: AnimeSummary[]; completed: AnimeSummary[]; planned: AnimeSummary[] },
  remote: { watching: AnimeSummary[]; completed: AnimeSummary[]; planned: AnimeSummary[] },
) {
  const mergeList = (a: AnimeSummary[], b: AnimeSummary[]) => {
    const map = new Map<string, AnimeSummary>();
    for (const item of a) map.set(item.id, item);
    for (const item of b) map.set(item.id, item);
    return [...map.values()];
  };
  return {
    watching: mergeList(local.watching, remote.watching),
    completed: mergeList(local.completed, remote.completed),
    planned: mergeList(local.planned, remote.planned),
  };
}

/** Fire-and-forget: sync library list changes while logged in. */
export function syncLibraryAction(
  anime: AnimeSummary | null,
  list: LibraryList,
  removeAnimeId?: string,
): void {
  if (!isAuthenticated()) return;
  if (removeAnimeId && isMalId(removeAnimeId)) {
    void apiClient.removeLibrary(Number(removeAnimeId)).catch(() => undefined);
    return;
  }
  if (anime && isMalId(anime.id)) {
    void apiClient.upsertLibrary(Number(anime.id), list).catch(() => undefined);
  }
}

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
  type AnimeSummaryDto,
  type HistoryEntryDto,
} from "./apiClient";
import { useAuthStore } from "@/store/auth.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHistoryStore } from "@/store/history.store";
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
}

async function pullAndMerge(): Promise<void> {
  const [favRes, histRes] = await Promise.all([
    apiClient.getFavorites(1),
    apiClient.getHistory(1),
  ]);

  const remoteFavs = favRes.data.map(dtoToSummary);
  const localFavs = useFavoritesStore.getState().items;
  useFavoritesStore.getState().replaceAll(mergeFavorites(localFavs, remoteFavs));

  const remoteHist = histRes.data.map(dtoToHistory);
  const localHist = useHistoryStore.getState().entries;
  useHistoryStore.getState().replaceAll(mergeHistory(localHist, remoteHist));
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

function dtoToSummary(d: AnimeSummaryDto): AnimeSummary {
  return {
    id: d.id,
    malId: d.malId,
    title: d.title,
    titleEnglish: d.titleEnglish,
    description: d.description,
    image: d.image,
    banner: d.banner,
    rating: d.rating,
    genres: d.genres,
    themes: d.themes ?? [],
    demographics: [],
    smartTags: [],
    studios: [],
    status: "unknown",
    statusLabel: "Desconhecido",
    episodeCount: d.episodeCount,
    year: d.year,
    season: d.season,
    source: (d.source as AnimeSummary["source"]) ?? "jikan",
  };
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

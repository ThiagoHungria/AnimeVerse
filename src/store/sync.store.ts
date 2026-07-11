"use client";

import { create } from "zustand";

/**
 * Tracks whether the initial LocalStorage <-> backend sync has finished for the
 * current session (FASE 2.2-I.1).
 *
 * Backend recommendation queries gate on this flag so they never run against
 * stale server state before the user's local favorites/history/preferences have
 * been pushed and merged. It is intentionally NOT persisted: every fresh session
 * must re-sync before the flag flips back to true.
 *
 * The flag is set to `true` when `syncUserData` settles (success OR failure), so
 * a failed sync can never lock an authenticated user out of recommendations —
 * it simply falls back to the client engine via the existing selectors.
 */
interface SyncState {
  isSyncCompleted: boolean;
  setSyncCompleted: (value: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncCompleted: false,
  setSyncCompleted: (value) => set({ isSyncCompleted: value }),
}));

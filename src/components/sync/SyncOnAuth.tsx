"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useSyncStore } from "@/store/sync.store";
import { useHydrated } from "@/hooks/useHydrated";
import { syncUserData } from "@/services/syncService";

/**
 * Runs a full LocalStorage ↔ backend sync when the user is authenticated.
 * Triggers on login and on app mount (rehydrated session).
 */
export function SyncOnAuth() {
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || syncedRef.current) return;
    syncedRef.current = true;
    void syncUserData();
  }, [hydrated, isAuthenticated]);

  // Reset flags on logout so the next login re-syncs and re-gates backend
  // recommendation queries until that fresh sync completes.
  useEffect(() => {
    if (!isAuthenticated) {
      syncedRef.current = false;
      useSyncStore.getState().setSyncCompleted(false);
    }
  }, [isAuthenticated]);

  return null;
}

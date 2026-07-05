import { useSyncExternalStore } from "react";

/** True after the client has mounted (avoids SSR/localStorage hydration mismatches). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

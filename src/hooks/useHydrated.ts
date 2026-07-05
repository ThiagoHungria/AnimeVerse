import { useEffect, useState } from "react";

/**
 * Returns true once the component has mounted on the client.
 * Use it to gate rendering of LocalStorage-backed UI (favorites/history)
 * so SSR markup matches the first client render.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

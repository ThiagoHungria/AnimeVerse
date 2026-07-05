"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only, keeping dev HMR clean.
 * The SW provides a basic offline shell; richer caching can be added later.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal for the app */
      });
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

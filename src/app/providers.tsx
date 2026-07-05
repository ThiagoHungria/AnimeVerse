"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SyncOnAuth } from "@/components/sync/SyncOnAuth";

/**
 * App-wide client providers. The QueryClient is created lazily inside state so
 * it is stable across re-renders but unique per browser session.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SyncOnAuth />
      {children}
    </QueryClientProvider>
  );
}

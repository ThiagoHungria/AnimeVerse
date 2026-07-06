"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SyncOnAuth } from "@/components/sync/SyncOnAuth";
import { AchievementToast } from "@/features/gamification/components/AchievementToast";
import { GamificationBoot } from "@/features/gamification/components/GamificationBoot";
import { ViewTransitionProvider } from "@/components/layout/ViewTransitionProvider";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  const tree = (
    <QueryClientProvider client={client}>
      <ViewTransitionProvider />
      <GamificationBoot />
      <SyncOnAuth />
      <AchievementToast />
      {children}
    </QueryClientProvider>
  );

  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{tree}</GoogleOAuthProvider>
    );
  }

  return tree;
}

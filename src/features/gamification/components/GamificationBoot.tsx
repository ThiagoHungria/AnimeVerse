"use client";

import { useEffect } from "react";
import { useGamificationStore } from "@/store/gamification.store";

/** Records daily streak/XP once per browser session. */
export function GamificationBoot() {
  const recordDailyActivity = useGamificationStore((s) => s.recordDailyActivity);

  useEffect(() => {
    recordDailyActivity();
  }, [recordDailyActivity]);

  return null;
}

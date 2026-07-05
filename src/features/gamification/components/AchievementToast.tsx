"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBadge,
  useGamificationStore,
} from "@/store/gamification.store";

export function AchievementToast() {
  const pendingBadge = useGamificationStore((s) => s.pendingBadge);
  const clearPendingBadge = useGamificationStore((s) => s.clearPendingBadge);

  useEffect(() => {
    if (!pendingBadge) return;
    const t = setTimeout(clearPendingBadge, 4500);
    return () => clearTimeout(t);
  }, [pendingBadge, clearPendingBadge]);

  const badge = pendingBadge ? getBadge(pendingBadge) : null;

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="border-primary/40 bg-surface fixed bottom-6 right-6 z-[100] max-w-xs rounded-2xl border p-4 shadow-2xl shadow-black/50"
          role="status"
        >
          <p className="text-primary text-xs font-bold uppercase tracking-wide">
            Conquista desbloqueada!
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl">{badge.emoji}</span>
            <div>
              <p className="font-semibold">{badge.name}</p>
              <p className="text-muted text-sm">{badge.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

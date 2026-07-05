"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useGamificationStore } from "@/store/gamification.store";
import { levelFromXp } from "@/domain/gamification";
import { useHydrated } from "@/hooks/useHydrated";

export function XpIndicator() {
  const hydrated = useHydrated();
  const xp = useGamificationStore((s) => s.xp);

  if (!hydrated || xp === 0) return null;

  return (
    <Link
      href="/profile"
      className="border-primary/30 bg-primary/10 text-primary hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors hover:bg-primary/20 md:inline-flex"
      title="Ver progresso"
    >
      <Sparkles className="size-3" />
      Nv.{levelFromXp(xp)}
    </Link>
  );
}

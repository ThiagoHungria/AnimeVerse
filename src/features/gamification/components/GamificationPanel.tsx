"use client";

import { Flame, Sparkles, Trophy } from "lucide-react";
import { useGamificationStore } from "@/store/gamification.store";
import { BADGES, levelFromXp, xpProgressInLevel } from "@/domain/gamification";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/utils/cn";

export function GamificationPanel() {
  const hydrated = useHydrated();
  const xp = useGamificationStore((s) => s.xp);
  const streak = useGamificationStore((s) => s.streak);
  const unlockedBadges = useGamificationStore((s) => s.unlockedBadges);

  if (!hydrated) return null;

  const level = levelFromXp(xp);
  const progress = xpProgressInLevel(xp);

  return (
    <section className="border-border bg-surface/40 mt-8 rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Trophy className="text-primary size-5" />
            Progresso Otaku
          </h2>
          <p className="text-muted mt-1 text-sm">
            Ganhe XP assistindo, favoritando e explorando o catálogo.
          </p>
        </div>
        <div className="flex gap-3">
          <StatPill icon={Sparkles} label="Nível" value={String(level)} />
          <StatPill icon={Flame} label="Streak" value={`${streak}d`} />
          <StatPill icon={Trophy} label="XP" value={String(xp)} />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">Nível {level}</span>
          <span className="text-muted">
            {progress.current}/{progress.needed} XP
          </span>
        </div>
        <div className="bg-card h-2.5 overflow-hidden rounded-full">
          <div
            className="bg-brand-gradient h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">
          Conquistas
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {BADGES.map((badge) => {
            const unlocked = unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={cn(
                  "rounded-xl border p-3 text-center transition-all",
                  unlocked
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-card/50 opacity-50 grayscale",
                )}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <p className="mt-1 text-xs font-semibold">{badge.name}</p>
                <p className="text-muted mt-0.5 line-clamp-2 text-[10px]">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border px-3 py-2 text-center">
      <Icon className="text-primary mx-auto size-4" />
      <p className="mt-1 text-lg font-bold leading-none">{value}</p>
      <p className="text-muted mt-0.5 text-[10px] uppercase">{label}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Heart, Play, Sparkles, Trophy } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useGamificationStore } from "@/store/gamification.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHistoryStore } from "@/store/history.store";
import { useProfileStore } from "@/store/profile.store";
import { useHydrated } from "@/hooks/useHydrated";
import {
  levelFromXp,
  levelTitle,
  xpProgressInLevel,
} from "@/domain/gamification";
import { progressPercent } from "@/utils/format";

export function UserProfileCard() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const xp = useGamificationStore((s) => s.xp);
  const streak = useGamificationStore((s) => s.streak);
  const favorites = useFavoritesStore((s) => s.items);
  const entries = useHistoryStore((s) => s.entries);
  const genreScores = useProfileStore((s) => s.genreScores);

  if (!hydrated) return null;

  const level = levelFromXp(xp);
  const progress = xpProgressInLevel(xp);
  const episodesWatched = entries.length;
  const hoursWatched = Math.round(
    entries.reduce((acc, e) => acc + e.progress, 0) / 3600,
  );
  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g);

  const displayName = user?.name ?? "Visitante";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <motion.section
      className="border-border relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-surface to-card p-6 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-brand-gradient pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-brand-gradient relative flex size-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black text-white shadow-xl">
            {initial}
            <span className="border-background absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 bg-primary text-xs font-bold">
              {level}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black md:text-3xl">{displayName}</h1>
            <p className="text-primary mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
              <Trophy className="size-4" />
              Nível {level} — {levelTitle(level)}
            </p>
            <p className="text-muted mt-1 text-xs">
              {xp} XP · Streak {streak}d
            </p>
          </div>
        </div>

        {!user && (
          <Link
            href="/login"
            className="bg-brand-gradient ml-auto inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            Entrar para salvar progresso
          </Link>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">Progresso do nível</span>
          <span className="text-muted">
            {progress.current}/{progress.needed} XP
          </span>
        </div>
        <div className="bg-card h-2 overflow-hidden rounded-full">
          <motion.div
            className="bg-brand-gradient h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Play} label="Episódios" value={String(episodesWatched)} />
        <Stat icon={Clock} label="Horas" value={String(hoursWatched)} />
        <Stat icon={Heart} label="Favoritos" value={String(favorites.length)} />
        <Stat icon={Sparkles} label="Gêneros" value={String(topGenres.length)} />
      </div>

      {topGenres.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {topGenres.map((genre) => (
            <span
              key={genre}
              className="border-primary/30 bg-primary/10 text-primary rounded-full border px-3 py-1 text-xs font-medium"
            >
              {genre}
            </span>
          ))}
        </div>
      )}
    </motion.section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Play;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card/60 rounded-xl border p-3 text-center">
      <Icon className="text-primary mx-auto size-4" />
      <p className="mt-1 text-lg font-bold">{value}</p>
      <p className="text-muted text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

/** Hours from history entries — exported for tests. */
export function computeHoursWatched(
  entries: { progress: number; duration: number }[],
): number {
  return Math.round(
    entries.reduce(
      (acc, e) => acc + progressPercent(e.progress, e.duration) / 100,
      0,
    ) * 0.4,
  );
}

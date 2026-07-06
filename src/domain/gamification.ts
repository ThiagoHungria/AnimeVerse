/** XP awarded per action. */
export const XP_REWARDS = {
  watchEpisode: 25,
  completeEpisode: 50,
  favorite: 15,
  dailyLogin: 50,
  explore: 10,
} as const;

export type BadgeId =
  | "first_watch"
  | "binge_5"
  | "favorite_fan"
  | "streak_3"
  | "streak_7"
  | "explorer"
  | "otaku_1000";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first_watch",
    name: "Primeiro Episódio",
    description: "Assistiu seu primeiro episódio",
    emoji: "▶️",
  },
  {
    id: "binge_5",
    name: "Maratonista",
    description: "Completou 5 episódios",
    emoji: "🔥",
  },
  {
    id: "favorite_fan",
    name: "Colecionador",
    description: "Favoritou 5 animes",
    emoji: "❤️",
  },
  {
    id: "streak_3",
    name: "Streak 3 dias",
    description: "3 dias seguidos ativo",
    emoji: "⚡",
  },
  {
    id: "streak_7",
    name: "Streak 7 dias",
    description: "7 dias seguidos ativo",
    emoji: "🏆",
  },
  {
    id: "explorer",
    name: "Explorador",
    description: "Usou filtros no Explorar",
    emoji: "🧭",
  },
  {
    id: "otaku_1000",
    name: "Otaku Lendário",
    description: "Alcançou 1000 XP",
    emoji: "👑",
  },
];

export interface GamificationStats {
  episodesWatched: number;
  episodesCompleted: number;
  favoritesAdded: number;
  exploreSessions: number;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 20, title: "Otaku Lendário" },
  { min: 15, title: "Otaku Elite" },
  { min: 12, title: "Otaku Veterano" },
  { min: 8, title: "Maratonista" },
  { min: 5, title: "Explorador" },
  { min: 3, title: "Iniciante" },
  { min: 1, title: "Novato" },
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES.find((t) => level >= t.min)?.title ?? "Novato";
}

export function xpProgressInLevel(xp: number): {
  current: number;
  needed: number;
  percent: number;
} {
  const level = levelFromXp(xp);
  const base = (level - 1) * 200;
  const current = xp - base;
  const needed = 200;
  return {
    current,
    needed,
    percent: Math.min(100, Math.round((current / needed) * 100)),
  };
}

export function badgesToUnlock(
  stats: GamificationStats,
  streak: number,
  xp: number,
  unlocked: BadgeId[],
): BadgeId[] {
  const next: BadgeId[] = [];
  const has = (id: BadgeId) => unlocked.includes(id);

  if (stats.episodesWatched >= 1 && !has("first_watch")) next.push("first_watch");
  if (stats.episodesCompleted >= 5 && !has("binge_5")) next.push("binge_5");
  if (stats.favoritesAdded >= 5 && !has("favorite_fan")) next.push("favorite_fan");
  if (streak >= 3 && !has("streak_3")) next.push("streak_3");
  if (streak >= 7 && !has("streak_7")) next.push("streak_7");
  if (stats.exploreSessions >= 1 && !has("explorer")) next.push("explorer");
  if (xp >= 1000 && !has("otaku_1000")) next.push("otaku_1000");

  return next;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

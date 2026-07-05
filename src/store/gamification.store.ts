import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BADGES,
  type BadgeId,
  badgesToUnlock,
  todayKey,
  XP_REWARDS,
  type GamificationStats,
} from "@/domain/gamification";

interface GamificationState {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  unlockedBadges: BadgeId[];
  stats: GamificationStats;
  completedEpisodeKeys: string[];
  viewedEpisodeKeys: string[];
  /** Last badge unlocked — consumed by toast UI. */
  pendingBadge: BadgeId | null;
  addXp: (amount: number) => void;
  recordDailyActivity: () => void;
  recordWatch: (animeId: string, episodeId: string, completed: boolean) => void;
  recordFavorite: () => void;
  recordExplore: () => void;
  clearPendingBadge: () => void;
}

const defaultStats: GamificationStats = {
  episodesWatched: 0,
  episodesCompleted: 0,
  favoritesAdded: 0,
  exploreSessions: 0,
};

function unlockBadges(
  state: Pick<
    GamificationState,
    "xp" | "streak" | "stats" | "unlockedBadges"
  >,
): { unlockedBadges: BadgeId[]; pendingBadge: BadgeId | null } {
  const newIds = badgesToUnlock(
    state.stats,
    state.streak,
    state.xp,
    state.unlockedBadges,
  );
  if (newIds.length === 0) {
    return { unlockedBadges: state.unlockedBadges, pendingBadge: null };
  }
  return {
    unlockedBadges: [...state.unlockedBadges, ...newIds],
    pendingBadge: newIds[0] ?? null,
  };
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set) => ({
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      unlockedBadges: [],
      stats: { ...defaultStats },
      completedEpisodeKeys: [],
      viewedEpisodeKeys: [],
      pendingBadge: null,

      addXp: (amount) =>
        set((state) => {
          const xp = state.xp + amount;
          const unlock = unlockBadges({ ...state, xp });
          return { xp, ...unlock };
        }),

      recordDailyActivity: () =>
        set((state) => {
          const today = todayKey();
          if (state.lastActiveDate === today) return state;

          let streak = 1;
          if (state.lastActiveDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = yesterday.toISOString().slice(0, 10);
            streak =
              state.lastActiveDate === yKey ? state.streak + 1 : 1;
          }

          const xp = state.xp + XP_REWARDS.dailyLogin;
          const next = {
            ...state,
            streak,
            lastActiveDate: today,
            xp,
          };
          const unlock = unlockBadges(next);
          return { ...next, ...unlock };
        }),

      recordWatch: (animeId, episodeId, completed) =>
        set((state) => {
          const key = `${animeId}::${episodeId}`;
          const alreadyCompleted = state.completedEpisodeKeys.includes(key);
          const alreadyViewed = state.viewedEpisodeKeys.includes(key);

          const stats = { ...state.stats };
          let xpGain = 0;
          let viewedEpisodeKeys = state.viewedEpisodeKeys;
          let completedEpisodeKeys = state.completedEpisodeKeys;

          if (!alreadyViewed) {
            stats.episodesWatched += 1;
            xpGain += XP_REWARDS.watchEpisode;
            viewedEpisodeKeys = [...viewedEpisodeKeys, key];
          }

          if (completed && !alreadyCompleted) {
            stats.episodesCompleted += 1;
            xpGain += XP_REWARDS.completeEpisode;
            completedEpisodeKeys = [...completedEpisodeKeys, key];
          }

          if (xpGain === 0) return state;

          const xp = state.xp + xpGain;
          const next = { ...state, stats, completedEpisodeKeys, viewedEpisodeKeys, xp };
          const unlock = unlockBadges(next);
          return { ...next, ...unlock };
        }),

      recordFavorite: () =>
        set((state) => {
          const stats = {
            ...state.stats,
            favoritesAdded: state.stats.favoritesAdded + 1,
          };
          const xp = state.xp + XP_REWARDS.favorite;
          const next = { ...state, stats, xp };
          const unlock = unlockBadges(next);
          return { ...next, ...unlock };
        }),

      recordExplore: () =>
        set((state) => {
          if (state.stats.exploreSessions > 0) return state;
          const stats = {
            ...state.stats,
            exploreSessions: state.stats.exploreSessions + 1,
          };
          const xp = state.xp + XP_REWARDS.explore;
          const next = { ...state, stats, xp };
          const unlock = unlockBadges(next);
          return { ...next, ...unlock };
        }),

      clearPendingBadge: () => set({ pendingBadge: null }),
    }),
    { name: "animeverse:gamification" },
  ),
);

export function getBadge(id: BadgeId) {
  return BADGES.find((b) => b.id === id);
}

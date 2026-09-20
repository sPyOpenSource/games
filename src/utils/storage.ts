import { GameId, UserStats } from '../types';

const STORAGE_KEY = 'arcadesphere_stats_v1';

const DEFAULT_STATS: UserStats = {
  plays: {
    snake: 0,
    '2048': 0,
    breakout: 0,
    flappy: 0,
    minesweeper: 0,
    simon: 0,
    ra: 0,
    checkers: 0,
    go: 0,
    bear: 0,
    five: 0,
  },
  highScores: {
    snake: 0,
    '2048': 0,
    breakout: 0,
    flappy: 0,
    minesweeper: 0,
    simon: 0,
    ra: 0,
    checkers: 0,
    go: 0,
    bear: 0,
    five: 0,
  },
  favorites: ['snake', '2048'],
  unlockedAchievements: [],
  soundEnabled: true,
};

export function loadUserStats(): UserStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATS,
      ...parsed,
      plays: { ...DEFAULT_STATS.plays, ...(parsed.plays || {}) },
      highScores: { ...DEFAULT_STATS.highScores, ...(parsed.highScores || {}) },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_STATS.favorites,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save user stats', err);
  }
}

export function recordGamePlay(gameId: GameId, score: number): { isNewHighScore: boolean; stats: UserStats } {
  const current = loadUserStats();
  const currentHigh = current.highScores[gameId] || 0;
  const isNewHighScore = score > currentHigh;

  const updated: UserStats = {
    ...current,
    lastPlayed: gameId,
    plays: {
      ...current.plays,
      [gameId]: (current.plays[gameId] || 0) + 1,
    },
    highScores: {
      ...current.highScores,
      [gameId]: isNewHighScore ? score : currentHigh,
    },
  };

  saveUserStats(updated);
  return { isNewHighScore, stats: updated };
}

export function toggleFavorite(gameId: GameId): UserStats {
  const current = loadUserStats();
  const isFav = current.favorites.includes(gameId);
  const updated: UserStats = {
    ...current,
    favorites: isFav
      ? current.favorites.filter((id) => id !== gameId)
      : [...current.favorites, gameId],
  };
  saveUserStats(updated);
  return updated;
}

export type GameId =
  | 'snake'
  | '2048'
  | 'breakout'
  | 'flappy'
  | 'minesweeper'
  | 'simon'
  | 'ra'
  | 'checkers'
  | 'go'
  | 'bear'
  | 'five';

export type GameCategory = 'all' | 'arcade' | 'puzzle' | 'classic' | 'action' | 'board';

export interface GameInfo {
  id: GameId;
  title: string;
  subtitle: string;
  category: 'arcade' | 'puzzle' | 'classic' | 'action' | 'board';
  description: string;
  imageUrl: string;
  instructions: string[];
  controls: { key: string; action: string }[];
  tags: string[];
  difficulty: 'Casual' | 'Medium' | 'Challenging';
  accentColor: string; // Tailwind color or hex
  glowColor: string;
  iconName?: string;
}

export interface UserStats {
  plays: Record<GameId, number>;
  highScores: Record<GameId, number>;
  favorites: GameId[];
  unlockedAchievements: string[];
  lastPlayed?: GameId;
  soundEnabled: boolean;
}

export interface Achievement {
  id: string;
  gameId: GameId | 'global';
  title: string;
  description: string;
  icon: string;
}

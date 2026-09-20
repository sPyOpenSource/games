import { useState, useEffect, useMemo } from 'react';
import { GameCategory, GameId, UserStats } from './types';
import { GAMES_DATA } from './data/gamesData';
import { loadUserStats, saveUserStats, recordGamePlay, toggleFavorite } from './utils/storage';
import { Header } from './components/Header';
import { GameCard } from './components/GameCard';
import { StatsModal } from './components/StatsModal';
import { GameViewer } from './components/GameViewer';
import { Search, Flame, Sparkles, Heart, Dices, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [stats, setStats] = useState<UserStats>(() => loadUserStats());
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'highScore' | 'title'>('popular');
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Sync state to local storage when modified
  const updateStats = (newStats: UserStats) => {
    setStats(newStats);
    saveUserStats(newStats);
  };

  const handleToggleSound = () => {
    updateStats({
      ...stats,
      soundEnabled: !stats.soundEnabled,
    });
  };

  const handleToggleFavorite = (gameId: GameId) => {
    const updated = toggleFavorite(gameId);
    setStats(updated);
  };

  const handleGameOver = (gameId: GameId, score: number) => {
    const { isNewHighScore, stats: updatedStats } = recordGamePlay(gameId, score);
    setStats(updatedStats);

    if (isNewHighScore && score > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleRandomGame = () => {
    const randomIndex = Math.floor(Math.random() * GAMES_DATA.length);
    setActiveGameId(GAMES_DATA[randomIndex].id);
  };

  const handleResetStats = () => {
    const clean: UserStats = {
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
      soundEnabled: stats.soundEnabled,
    };
    updateStats(clean);
  };

  // Keyboard shortcut: Esc to return to lobby
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeGameId) {
        setActiveGameId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGameId]);

  // Filter & sort games
  const filteredGames = useMemo(() => {
    return GAMES_DATA.filter((game) => {
      // Category filter
      if (selectedCategory === 'favorites') {
        if (!stats.favorites.includes(game.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (game.category !== selectedCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchDesc = game.description.toLowerCase().includes(q);
        const matchTags = game.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popular') {
        return (stats.plays[b.id] || 0) - (stats.plays[a.id] || 0);
      }
      if (sortBy === 'highScore') {
        return (stats.highScores[b.id] || 0) - (stats.highScores[a.id] || 0);
      }
      return a.title.localeCompare(b.title);
    });
  }, [selectedCategory, searchQuery, sortBy, stats.favorites, stats.plays, stats.highScores]);

  // Featured game (Last played or Cyber Snake)
  const featuredGame = useMemo(() => {
    const lastId = stats.lastPlayed;
    if (lastId) {
      const match = GAMES_DATA.find((g) => g.id === lastId);
      if (match) return match;
    }
    return GAMES_DATA[0];
  }, [stats.lastPlayed]);

  // If a game is active, render dedicated GameViewer
  if (activeGameId) {
    const activeGame = GAMES_DATA.find((g) => g.id === activeGameId) || GAMES_DATA[0];
    return (
      <GameViewer
        game={activeGame}
        stats={stats}
        onBack={() => setActiveGameId(null)}
        onSelectGame={(id) => setActiveGameId(id)}
        onGameOver={handleGameOver}
        onToggleSound={handleToggleSound}
      />
    );
  }

  // Otherwise render the Arcade Lobby
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        stats={stats}
        onToggleSound={handleToggleSound}
        onOpenStats={() => setIsStatsOpen(true)}
        onRandomGame={handleRandomGame}
        onGoHome={() => {
          setSelectedCategory('all');
          setSearchQuery('');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-8">
        {/* Hero Featured Game Spotlight */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 shadow-2xl p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Game of the Day</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {featuredGame.title}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                {featuredGame.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {featuredGame.difficulty} Difficulty
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {featuredGame.category.toUpperCase()}
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  High Score: {stats.highScores[featuredGame.id] || 0}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div
                onClick={() => setActiveGameId(featuredGame.id)}
                className="relative w-40 h-24 rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg cursor-pointer group shrink-0 hidden md:block"
                title={`Play ${featuredGame.title}`}
              >
                <img
                  src={featuredGame.imageUrl}
                  alt={featuredGame.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition-colors" />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button
                  id="hero-play-featured-btn"
                  onClick={() => setActiveGameId(featuredGame.id)}
                  className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4 fill-current text-slate-950" />
                  <span>Play {featuredGame.title}</span>
                </button>
                <button
                  onClick={handleRandomGame}
                  className="px-5 py-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Dices className="w-4 h-4 text-violet-400" />
                  <span>Random Game</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Metrics & Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Arcade Games</div>
              <div className="text-xl font-bold text-white font-mono">{GAMES_DATA.length} Ready</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Matches</div>
              <div className="text-xl font-bold text-white font-mono">
                {Object.values(stats.plays).reduce((a, b) => a + b, 0)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Top High Score</div>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {Math.max(...Object.values(stats.highScores), 0)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Favorited</div>
              <div className="text-xl font-bold text-rose-400 font-mono">
                {stats.favorites.length} Games
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {[
              { id: 'all', label: 'All Games' },
              { id: 'arcade', label: 'Arcade' },
              { id: 'puzzle', label: 'Puzzle' },
              { id: 'action', label: 'Action' },
              { id: 'classic', label: 'Classic' },
              { id: 'board', label: 'Board' },
              { id: 'favorites', label: 'Favorites' },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                  {cat.id === 'favorites' && stats.favorites.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
                      {stats.favorites.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search input & Sort selection */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="arcade-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games, tags..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-xs text-white pl-9 pr-3 py-2 rounded-xl outline-none placeholder:text-slate-500 transition"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-500 transition"
            >
              <option value="popular">Most Played</option>
              <option value="highScore">Highest Score</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                stats={stats}
                onSelectGame={(id) => setActiveGameId(id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 my-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base mb-1">No Games Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              We couldn't find any games matching "{searchQuery}". Try selecting "All Games" or clear your filter.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">ArcadeSphere</span>
            <span>•</span>
            <span>Instant HTML5 Canvas and Puzzle Games</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Sound synthesized via Web Audio API</span>
            <span>•</span>
            <span>High scores stored locally</span>
          </div>
        </div>
      </footer>

      {/* Stats & Trophies Modal */}
      <StatsModal
        stats={stats}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onResetStats={handleResetStats}
      />
    </div>
  );
}

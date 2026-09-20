import React from 'react';
import { GameInfo, UserStats } from '../types';
import { Play, Trophy, Heart } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
  stats: UserStats;
  onSelectGame: (gameId: GameInfo['id']) => void;
  onToggleFavorite: (gameId: GameInfo['id']) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  stats,
  onSelectGame,
  onToggleFavorite,
}) => {
  const isFavorite = stats.favorites.includes(game.id);
  const highScore = stats.highScores[game.id] || 0;
  const playCount = stats.plays[game.id] || 0;

  const getDifficultyBadge = (diff: GameInfo['difficulty']) => {
    switch (diff) {
      case 'Casual':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">Casual</span>;
      case 'Medium':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">Medium</span>;
      case 'Challenging':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md">Challenging</span>;
    }
  };

  return (
    <div className="group relative rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1">
      {/* Game Image Picture Banner */}
      <div
        onClick={() => onSelectGame(game.id)}
        className="relative w-full h-44 overflow-hidden bg-slate-950 cursor-pointer"
      >
        <img
          src={game.imageUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent pointer-events-none" />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur text-slate-200 border border-slate-700/80 uppercase tracking-wide">
            {game.category}
          </span>
          {getDifficultyBadge(game.difficulty)}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/70 backdrop-blur border border-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-900/90 transition z-10"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : ''
            }`}
          />
        </button>

        {/* Quick Play Hover Indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Content & Short Description */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-2">
            <h3
              onClick={() => onSelectGame(game.id)}
              className="font-bold text-white text-lg tracking-tight group-hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {game.title}
            </h3>
            <p className="text-xs text-slate-400 font-medium -mt-0.5">
              {game.subtitle}
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {game.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 mb-1">
          {game.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-400 border border-slate-800">
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer with High Score, Plays, and Launch Button */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-300" title="Your High Score">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">{highScore}</span>
          </div>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">{playCount} plays</span>
        </div>

        <button
          onClick={() => onSelectGame(game.id)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play</span>
        </button>
      </div>
    </div>
  );
};

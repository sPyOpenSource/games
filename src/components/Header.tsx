import React from 'react';
import { Gamepad2, Volume2, VolumeX, Trophy, Dices } from 'lucide-react';
import { UserStats } from '../types';

interface HeaderProps {
  stats: UserStats;
  onToggleSound: () => void;
  onOpenStats: () => void;
  onRandomGame: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onToggleSound,
  onOpenStats,
  onRandomGame,
  onGoHome,
}) => {
  const totalPlays = Object.values(stats.plays).reduce((a, b) => a + b, 0);

  return (
    <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                Arcade<span className="text-cyan-400">Sphere</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
              Web Games Arcade Collection
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Surprise Me / Random button */}
          <button
            onClick={onRandomGame}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Launch a random game"
          >
            <Dices className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Surprise Me</span>
          </button>

          {/* Stats & Trophies Modal Button */}
          <button
            onClick={onOpenStats}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Arcade Hall of Fame & Achievements"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Stats & Trophies</span>
            {totalPlays > 0 && (
              <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded-full font-mono border border-slate-700">
                {totalPlays}
              </span>
            )}
          </button>

          {/* Global Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border text-xs transition active:scale-95 ${
              stats.soundEnabled
                ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-800'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={stats.soundEnabled ? 'Mute Sounds' : 'Enable Arcade Sounds'}
          >
            {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

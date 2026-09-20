import React from 'react';
import { UserStats } from '../types';
import { ACHIEVEMENTS_LIST, GAMES_DATA } from '../data/gamesData';
import { X, Trophy, Award, Gamepad2, CheckCircle2, Circle, Flame } from 'lucide-react';

interface StatsModalProps {
  stats: UserStats;
  isOpen: boolean;
  onClose: () => void;
  onResetStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  isOpen,
  onClose,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const totalPlays = Object.values(stats.plays).reduce((a, b) => a + b, 0);
  const totalScore = Object.values(stats.highScores).reduce((a, b) => a + b, 0);

  // Compute unlocked achievements based on user performance
  const isAchievementUnlocked = (achId: string) => {
    switch (achId) {
      case 'first_game':
        return totalPlays > 0;
      case 'snake_50':
        return (stats.highScores.snake || 0) >= 50;
      case 'snake_100':
        return (stats.highScores.snake || 0) >= 100;
      case 'tile_1024':
        return (stats.highScores['2048'] || 0) >= 1024;
      case 'tile_2048':
        return (stats.highScores['2048'] || 0) >= 2048;
      case 'breakout_clear':
        return (stats.highScores.breakout || 0) >= 500;
      case 'flappy_20':
        return (stats.highScores.flappy || 0) >= 20;
      case 'mines_clear':
        return (stats.highScores.minesweeper || 0) > 0;
      case 'simon_10':
        return (stats.highScores.simon || 0) >= 10;
      default:
        return false;
    }
  };

  const unlockedCount = ACHIEVEMENTS_LIST.filter((a) => isAchievementUnlocked(a.id)).length;
  const progressPercent = Math.round((unlockedCount / ACHIEVEMENTS_LIST.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Arcade Hall of Fame</h3>
              <p className="text-xs text-slate-400">Player statistics and unlockable trophies</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" /> Total Plays
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">{totalPlays}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> High Score Sum
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">{totalScore}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Trophies
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                {unlockedCount}/{ACHIEVEMENTS_LIST.length}
              </div>
            </div>
          </div>

          {/* Achievement Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Trophy Completion</span>
              <span className="font-mono text-amber-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Game Records Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Game Records
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GAMES_DATA.map((g) => {
                const high = stats.highScores[g.id] || 0;
                const plays = stats.plays[g.id] || 0;
                return (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={g.imageUrl}
                        alt={g.title}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-white text-sm">{g.title}</div>
                        <div className="text-[11px] text-slate-500">{plays} matches played</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400 font-sans">Best</div>
                      <div className="text-base font-bold text-amber-400">{high}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trophies Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Trophy Catalog
            </h4>
            <div className="space-y-2">
              {ACHIEVEMENTS_LIST.map((ach) => {
                const unlocked = isAchievementUnlocked(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      unlocked
                        ? 'bg-amber-950/20 border-amber-900/40 text-slate-200'
                        : 'bg-slate-950/30 border-slate-800/50 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          unlocked
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{ach.title}</div>
                        <div className="text-xs text-slate-400">{ach.description}</div>
                      </div>
                    </div>

                    {unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all high scores and plays?')) {
                onResetStats();
              }
            }}
            className="text-xs text-rose-400 hover:text-rose-300 transition"
          >
            Clear All Stats
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

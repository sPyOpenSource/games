import React, { useState } from 'react';
import { GameId, GameInfo, UserStats } from '../types';
import { GAMES_DATA } from '../data/gamesData';
import { ArrowLeft, Maximize2, Minimize2, HelpCircle, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { SnakeGame } from './games/SnakeGame';
import { Game2048 } from './games/Game2048';
import { BreakoutGame } from './games/BreakoutGame';
import { FlappyGame } from './games/FlappyGame';
import { MinesweeperGame } from './games/MinesweeperGame';
import { SimonGame } from './games/SimonGame';

interface GameViewerProps {
  game: GameInfo;
  stats: UserStats;
  onBack: () => void;
  onSelectGame: (gameId: GameId) => void;
  onGameOver: (gameId: GameId, score: number) => void;
  onToggleSound: () => void;
}

export const GameViewer: React.FC<GameViewerProps> = ({
  game,
  stats,
  onBack,
  onSelectGame,
  onGameOver,
  onToggleSound,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleGameScore = (score: number) => {
    onGameOver(game.id, score);
  };

  const renderEmbeddedGame = (src: string, title: string) => (
    <div className="w-full max-w-5xl h-[75vh] min-h-[600px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
      <iframe
        src={src}
        title={title}
        className="w-full h-full border-0 block"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );

  const renderCurrentGame = () => {
    switch (game.id) {
      case 'snake':
        return (
          <SnakeGame
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores.snake || 0}
          />
        );
      case '2048':
        return (
          <Game2048
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores['2048'] || 0}
          />
        );
      case 'breakout':
        return (
          <BreakoutGame
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores.breakout || 0}
          />
        );
      case 'flappy':
        return (
          <FlappyGame
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores.flappy || 0}
          />
        );
      case 'minesweeper':
        return (
          <MinesweeperGame
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores.minesweeper || 0}
          />
        );
      case 'simon':
        return (
          <SimonGame
            soundEnabled={stats.soundEnabled}
            onGameOver={handleGameScore}
            highScore={stats.highScores.simon || 0}
          />
        );
      case 'five':
        return renderEmbeddedGame('https://play-game-together.lovable.app', '五子棋');
      case 'ra':
        return renderEmbeddedGame('https://osjs.lovable.app/', 'Red Alert');
      case 'go':
        return renderEmbeddedGame('https://multiplayer-board-games.lovable.app', 'Go');
      case 'bear':
        return renderEmbeddedGame('https://neon-dreamscape-vr.lovable.app', 'Bear Adventure');
      case 'checkers':
        return renderEmbeddedGame('https://snap-exact-engine.lovable.app', 'Checkers');
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Game Viewer Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Lobby Button & Game Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Return to Arcade Lobby"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Lobby</span>
            </button>

            {/* Quick Game Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center gap-2 transition"
              >
                <span>{game.title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isSwitcherOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setIsSwitcherOpen(false)}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500 px-2.5 py-1">
                    Switch Game
                  </div>
                  {GAMES_DATA.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => onSelectGame(g.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition ${
                        g.id === game.id
                          ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={g.imageUrl}
                          alt={g.title}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded object-cover border border-slate-700 shrink-0"
                        />
                        <span className="truncate">{g.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {stats.highScores[g.id] || 0} pts
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Help / Instructions Modal Toggle */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-2 rounded-xl border text-xs transition ${
                showHelp
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl border text-xs transition ${
                stats.soundEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={stats.soundEnabled ? 'Mute' : 'Unmute'}
            >
              {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Stage Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {/* Help Banner if toggled */}
        {showHelp && (
          <div className="w-full max-w-2xl mb-6 bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span>How to Play {game.title}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">{game.subtitle}</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {game.instructions.map((ins, i) => (
                <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{ins}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                Controls
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {game.controls.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800"
                  >
                    <span className="font-mono text-cyan-300 font-medium">{c.key}</span>
                    <span className="text-slate-400">{c.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* The Game Component */}
        <div className="w-full flex items-center justify-center">
          {renderCurrentGame()}
        </div>
      </main>
    </div>
  );
};

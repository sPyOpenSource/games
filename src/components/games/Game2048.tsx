import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Undo2, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface Game2048Props {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

type Board = number[][];

export const Game2048: React.FC<Game2048Props> = ({ soundEnabled, onGameOver, highScore }) => {
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);
  const [scoreAdd, setScoreAdd] = useState<number | null>(null);
  const [history, setHistory] = useState<{ board: Board; score: number }[]>([]);
  const [undoRemaining, setUndoRemaining] = useState(3);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Add random tile (2 or 4) to empty spot
  const addRandomTile = useCallback((currentBoard: Board): Board => {
    const emptyCells: { r: number; c: number }[] = [];
    currentBoard.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 0) emptyCells.push({ r, c });
      });
    });

    if (emptyCells.length === 0) return currentBoard;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { r, c } = emptyCells[randomIndex];
    const newBoard = currentBoard.map((row) => [...row]);
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }, []);

  const initGame = useCallback(() => {
    let newBoard: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setHistory([]);
    setUndoRemaining(3);
    setWon(false);
    setKeepPlaying(false);
    setIsGameOver(false);
    SoundEffects.playClick(soundEnabled);
  }, [addRandomTile, soundEnabled]);

  // Initial mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Check if moves are available
  const canMove = useCallback((b: Board): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) return true;
        if (c < 3 && b[r][c] === b[r][c + 1]) return true;
        if (r < 3 && b[r][c] === b[r + 1][c]) return true;
      }
    }
    return false;
  }, []);

  // Slide and merge one row
  const slideRow = (row: number[]): { newRow: number[]; earned: number } => {
    const filtered = row.filter((v) => v !== 0);
    const newRow: number[] = [];
    let earned = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        newRow.push(merged);
        earned += merged;
        i++; // skip next since merged
      } else {
        newRow.push(filtered[i]);
      }
    }

    while (newRow.length < 4) {
      newRow.push(0);
    }

    return { newRow, earned };
  };

  const move = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (isGameOver || (won && !keepPlaying)) return;

      let changed = false;
      let roundScoreEarned = 0;
      const prevBoard = board.map((r) => [...r]);
      const prevScore = score;
      let nextBoard: Board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      if (direction === 'LEFT') {
        for (let r = 0; r < 4; r++) {
          const { newRow, earned } = slideRow(board[r]);
          nextBoard[r] = newRow;
          roundScoreEarned += earned;
          if (newRow.some((val, idx) => val !== board[r][idx])) changed = true;
        }
      } else if (direction === 'RIGHT') {
        for (let r = 0; r < 4; r++) {
          const reversed = [...board[r]].reverse();
          const { newRow, earned } = slideRow(reversed);
          const restored = newRow.reverse();
          nextBoard[r] = restored;
          roundScoreEarned += earned;
          if (restored.some((val, idx) => val !== board[r][idx])) changed = true;
        }
      } else if (direction === 'UP') {
        for (let c = 0; c < 4; c++) {
          const col = [board[0][c], board[1][c], board[2][c], board[3][c]];
          const { newRow, earned } = slideRow(col);
          roundScoreEarned += earned;
          for (let r = 0; r < 4; r++) {
            nextBoard[r][c] = newRow[r];
            if (newRow[r] !== board[r][c]) changed = true;
          }
        }
      } else if (direction === 'DOWN') {
        for (let c = 0; c < 4; c++) {
          const col = [board[3][c], board[2][c], board[1][c], board[0][c]];
          const { newRow, earned } = slideRow(col);
          roundScoreEarned += earned;
          const restored = newRow.reverse();
          for (let r = 0; r < 4; r++) {
            nextBoard[r][c] = restored[r];
            if (restored[r] !== board[r][c]) changed = true;
          }
        }
      }

      if (changed) {
        setHistory((prev) => [...prev.slice(-4), { board: prevBoard, score: prevScore }]);
        const updatedWithNew = addRandomTile(nextBoard);
        setBoard(updatedWithNew);

        const newTotalScore = score + roundScoreEarned;
        setScore(newTotalScore);

        if (roundScoreEarned > 0) {
          setScoreAdd(roundScoreEarned);
          setTimeout(() => setScoreAdd(null), 800);
          SoundEffects.playPop(soundEnabled, Math.min(3, 1 + roundScoreEarned / 128));
        } else {
          SoundEffects.playBounce(soundEnabled);
        }

        // Check 2048 win
        if (!won && !keepPlaying) {
          const reached2048 = updatedWithNew.some((row) => row.some((val) => val >= 2048));
          if (reached2048) {
            setWon(true);
            SoundEffects.playWin(soundEnabled);
            confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
          }
        }

        // Check if game over
        if (!canMove(updatedWithNew)) {
          setIsGameOver(true);
          SoundEffects.playGameOver(soundEnabled);
          onGameOver(newTotalScore);
        }
      }
    },
    [board, isGameOver, won, keepPlaying, score, addRandomTile, soundEnabled, canMove, onGameOver]
  );

  const handleUndo = () => {
    if (history.length === 0 || undoRemaining <= 0) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setScore(last.score);
    setHistory((prev) => prev.slice(0, -1));
    setUndoRemaining((r) => r - 1);
    setIsGameOver(false);
    SoundEffects.playClick(soundEnabled);
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          move('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          move('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          move('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          move('RIGHT');
          break;
        case 'u':
        case 'U':
          handleUndo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) move('RIGHT');
      else move('LEFT');
    } else {
      if (dy > 0) move('DOWN');
      else move('UP');
    }
  };

  const getTileStyle = (val: number): { bg: string } => {
    switch (val) {
      case 2:
        return { bg: 'bg-slate-800 text-slate-200 border-slate-700' };
      case 4:
        return { bg: 'bg-amber-950/60 text-amber-200 border-amber-800/60' };
      case 8:
        return { bg: 'bg-orange-600 text-white font-bold border-orange-500 shadow-md shadow-orange-600/30' };
      case 16:
        return { bg: 'bg-orange-500 text-white font-bold border-orange-400 shadow-md shadow-orange-500/40' };
      case 32:
        return { bg: 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-500/40' };
      case 64:
        return { bg: 'bg-rose-500 text-white font-black border-rose-400 shadow-lg shadow-rose-500/50' };
      case 128:
        return { bg: 'bg-yellow-400 text-slate-950 font-black border-yellow-200 shadow-xl shadow-yellow-400/50' };
      case 256:
        return { bg: 'bg-emerald-500 text-white font-black border-emerald-300 shadow-xl shadow-emerald-500/50' };
      case 512:
        return { bg: 'bg-cyan-500 text-slate-950 font-black border-cyan-200 shadow-xl shadow-cyan-500/50' };
      case 1024:
        return { bg: 'bg-blue-600 text-white font-black border-blue-400 shadow-2xl shadow-blue-500/60' };
      case 2048:
        return { bg: 'bg-purple-600 text-white font-black border-purple-300 shadow-2xl shadow-purple-500/70 animate-pulse' };
      default:
        return val > 2048
          ? { bg: 'bg-gradient-to-tr from-fuchsia-600 to-amber-500 text-white font-black border-amber-300 shadow-2xl' }
          : { bg: 'bg-slate-900/60 border-slate-800/60 text-transparent' };
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Score</div>
            <div className="text-2xl font-black text-amber-400 font-mono">{score}</div>
            {scoreAdd !== null && (
              <span className="absolute -top-3 right-0 text-xs font-bold text-amber-300 animate-bounce">
                +{scoreAdd}
              </span>
            )}
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="game2048-undo-btn"
            onClick={handleUndo}
            disabled={history.length === 0 || undoRemaining <= 0}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
              undoRemaining > 0 && history.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title={`Undo last move (${undoRemaining} left)`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo ({undoRemaining})</span>
          </button>

          <button
            id="game2048-restart-btn"
            onClick={initGame}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Restart 2048"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4x4 Board Matrix with Touch Swiping */}
      <div
        ref={boardContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative bg-slate-950 p-3.5 rounded-2xl border-2 border-slate-800 shadow-2xl aspect-square w-full select-none touch-none flex flex-col justify-between"
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2.5 h-full w-full">
          {board.map((row, r) =>
            row.map((val, c) => {
              const style = getTileStyle(val);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative rounded-xl border flex items-center justify-center transition-all duration-100 select-none ${style.bg} ${
                    val > 0 ? 'scale-100' : 'scale-95 opacity-40'
                  }`}
                >
                  {val > 0 && (
                    <span
                      className={`font-mono transition-transform ${
                        val < 100
                          ? 'text-2xl sm:text-3xl'
                          : val < 1000
                          ? 'text-xl sm:text-2xl'
                          : 'text-base sm:text-lg'
                      }`}
                    >
                      {val}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Win Modal Overlay */}
        {won && !keepPlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in zoom-in duration-200">
            <Trophy className="w-16 h-16 text-amber-400 mb-3 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            <h3 className="text-3xl font-black text-white mb-2">2048 Reached!</h3>
            <p className="text-sm text-slate-300 mb-6 max-w-xs">
              Magnificent puzzle mastery! You can keep sliding to achieve 4096 or restart.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setKeepPlaying(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition"
              >
                Keep Going
              </button>
              <button
                onClick={initGame}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm border border-slate-700 transition"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in zoom-in duration-200">
            <div className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-1">No Moves Left</div>
            <h3 className="text-3xl font-black text-white mb-2">Game Over</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 my-4 flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">Score</div>
                <div className="text-2xl font-black text-amber-400 font-mono">{score}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div>
                <div className="text-xs text-slate-400">Best</div>
                <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
              </div>
            </div>
            <button
              id="game2048-play-again-btn"
              onClick={initGame}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/25 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* On-screen Directional Controls for Mobile / Click */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          onClick={() => move('UP')}
          className="w-14 h-12 bg-slate-800 active:bg-amber-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => move('LEFT')}
            className="w-14 h-12 bg-slate-800 active:bg-amber-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => move('DOWN')}
            className="w-14 h-12 bg-slate-800 active:bg-amber-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
          <button
            onClick={() => move('RIGHT')}
            className="w-14 h-12 bg-slate-800 active:bg-amber-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

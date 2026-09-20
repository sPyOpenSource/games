import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Flag, Bomb, Trophy, Clock, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface MinesweeperGameProps {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

type Difficulty = 'novice' | 'intermediate' | 'expert';

const CONFIGS = {
  novice: { rows: 9, cols: 9, mines: 10, label: 'Novice (9x9)' },
  intermediate: { rows: 12, cols: 12, mines: 22, label: 'Standard (12x12)' },
  expert: { rows: 16, cols: 14, mines: 38, label: 'Expert (16x14)' },
};

export const MinesweeperGame: React.FC<MinesweeperGameProps> = ({
  soundEnabled,
  onGameOver,
  highScore,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('novice');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [flagsRemaining, setFlagsRemaining] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(2);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { rows, cols, mines } = CONFIGS[difficulty];

  // Initialize empty grid
  const initBoard = useCallback(() => {
    const newGrid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          r,
          c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setIsFirstClick(true);
    setIsGameOver(false);
    setHasWon(false);
    setFlagsRemaining(mines);
    setSeconds(0);
    setTimerActive(false);
    setHintsLeft(2);
    if (timerRef.current) clearInterval(timerRef.current);
    SoundEffects.playClick(soundEnabled);
  }, [rows, cols, mines, soundEnabled]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Timer tick
  useEffect(() => {
    if (timerActive && !isGameOver && !hasWon) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, isGameOver, hasWon]);

  // Generate mines with guaranteed safe first click
  const populateMines = (startR: number, startC: number, currentGrid: Cell[][]): Cell[][] => {
    const updated = currentGrid.map((r) => r.map((c) => ({ ...c })));
    let planted = 0;

    while (planted < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // Keep safe 3x3 surrounding zone for first click
      const isAroundStart = Math.abs(r - startR) <= 1 && Math.abs(c - startC) <= 1;
      if (!updated[r][c].isMine && !isAroundStart) {
        updated[r][c].isMine = true;
        planted++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!updated[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && updated[nr][nc].isMine) {
                count++;
              }
            }
          }
          updated[r][c].neighborMines = count;
        }
      }
    }

    return updated;
  };

  // Flood fill blank zero-mine tiles
  const revealNeighbors = (r: number, c: number, currentGrid: Cell[][]) => {
    const queue: [number, number][] = [[r, c]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [currR, currC] = queue.shift()!;
      const key = `${currR},${currC}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = currentGrid[currR][currC];
      if (cell.isFlagged) continue;
      cell.isRevealed = true;

      if (cell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighbor = currentGrid[nr][nc];
              if (!neighbor.isRevealed && !neighbor.isMine) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (isGameOver || hasWon) return;

    if (flagMode) {
      handleToggleFlag(r, c);
      return;
    }

    let currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

    if (isFirstClick) {
      currentGrid = populateMines(r, c, currentGrid);
      setIsFirstClick(false);
      setTimerActive(true);
    }

    const cell = currentGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (cell.isMine) {
      // Hit mine! Game over
      cell.isRevealed = true;
      // Reveal all mines
      currentGrid.forEach((row) =>
        row.forEach((cl) => {
          if (cl.isMine) cl.isRevealed = true;
        })
      );
      setGrid(currentGrid);
      setIsGameOver(true);
      setTimerActive(false);
      SoundEffects.playGameOver(soundEnabled);
      return;
    }

    // Safe reveal
    if (cell.neighborMines === 0) {
      revealNeighbors(r, c, currentGrid);
    } else {
      cell.isRevealed = true;
    }

    SoundEffects.playPop(soundEnabled, 1.2);
    setGrid(currentGrid);

    // Check Win
    let unrevealedSafe = 0;
    currentGrid.forEach((row) =>
      row.forEach((cl) => {
        if (!cl.isMine && !cl.isRevealed) unrevealedSafe++;
      })
    );

    if (unrevealedSafe === 0) {
      setHasWon(true);
      setTimerActive(false);
      SoundEffects.playWin(soundEnabled);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
      const winScore = Math.max(10, 1000 - seconds * 5);
      onGameOver(winScore);
    }
  };

  const handleToggleFlag = (r: number, c: number) => {
    if (isGameOver || hasWon) return;
    const currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const cell = currentGrid[r][c];
    if (cell.isRevealed) return;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsRemaining((f) => f + 1);
    } else {
      if (flagsRemaining <= 0) return;
      cell.isFlagged = true;
      setFlagsRemaining((f) => f - 1);
    }

    SoundEffects.playClick(soundEnabled);
    setGrid(currentGrid);
  };

  // Hint button: reveals 1 unrevealed non-mine tile
  const useHint = () => {
    if (hintsLeft <= 0 || isFirstClick || isGameOver || hasWon) return;

    const unrevealedSafeCells: Cell[] = [];
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (!cell.isMine && !cell.isRevealed && !cell.isFlagged) {
          unrevealedSafeCells.push(cell);
        }
      })
    );

    if (unrevealedSafeCells.length > 0) {
      const lucky = unrevealedSafeCells[Math.floor(Math.random() * unrevealedSafeCells.length)];
      setHintsLeft((h) => h - 1);
      setSeconds((s) => s + 10); // penalty
      handleCellClick(lucky.r, lucky.c);
    }
  };

  const getNumberColor = (num: number): string => {
    switch (num) {
      case 1: return 'text-blue-400 font-bold';
      case 2: return 'text-emerald-400 font-bold';
      case 3: return 'text-rose-400 font-bold';
      case 4: return 'text-purple-400 font-bold';
      case 5: return 'text-amber-400 font-bold';
      case 6: return 'text-cyan-400 font-bold';
      default: return 'text-slate-200 font-bold';
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-rose-400 font-mono font-bold text-lg">
            <Bomb className="w-4 h-4" />
            <span>{flagsRemaining}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-lg">
            <Clock className="w-4 h-4" />
            <span>{seconds}s</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-sm font-bold text-slate-200 font-mono">{highScore} pts</div>
          </div>
        </div>

        {/* Difficulty select & actions */}
        <div className="flex items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 outline-none focus:border-rose-500"
          >
            <option value="novice">Novice (9x9)</option>
            <option value="intermediate">Standard (12x12)</option>
            <option value="expert">Expert (16x14)</option>
          </select>

          <button
            onClick={initBoard}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Reset Board"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flag Mode & Hint Bar */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 px-1">
        <button
          onClick={() => setFlagMode(!flagMode)}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            flagMode
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <Flag className={`w-4 h-4 ${flagMode ? 'fill-rose-400 text-rose-400' : ''}`} />
          <span>{flagMode ? 'Flag Mode: ON (Tap to flag)' : 'Dig Mode: ON (Tap to reveal)'}</span>
        </button>

        <button
          onClick={useHint}
          disabled={hintsLeft <= 0 || isFirstClick || isGameOver || hasWon}
          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
            hintsLeft > 0 && !isFirstClick && !isGameOver && !hasWon
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
          title="Reveals 1 safe tile (+10s time penalty)"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Hint ({hintsLeft})</span>
        </button>
      </div>

      {/* Minefield Grid */}
      <div className="relative bg-slate-950 p-3 rounded-2xl border-2 border-slate-800 shadow-2xl overflow-x-auto max-w-full">
        <div
          className="grid gap-1 select-none"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            width: `${Math.min(420, cols * 32)}px`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleToggleFlag(r, c);
                  }}
                  className={`aspect-square rounded-md text-xs font-mono flex items-center justify-center transition-all ${
                    cell.isRevealed
                      ? cell.isMine
                        ? 'bg-rose-900/60 border border-rose-700 text-rose-200'
                        : 'bg-slate-900/90 border border-slate-800/80 shadow-inner'
                      : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 shadow-sm'
                  }`}
                >
                  {cell.isRevealed && cell.isMine && (
                    <Bomb className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                  )}
                  {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && (
                    <span className={getNumberColor(cell.neighborMines)}>
                      {cell.neighborMines}
                    </span>
                  )}
                  {!cell.isRevealed && cell.isFlagged && (
                    <Flag className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Win Banner */}
        {hasWon && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <Trophy className="w-16 h-16 text-amber-400 mb-3 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            <h3 className="text-2xl font-black text-white mb-1">Minefield Defused!</h3>
            <p className="text-sm text-slate-300 mb-4">Completed in {seconds} seconds.</p>
            <button
              onClick={initBoard}
              className="px-6 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-sm transition"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Game Over Banner */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
              <Bomb className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">Detonation!</h3>
            <p className="text-xs text-slate-400 mb-4">A quantum mine was triggered.</p>
            <button
              onClick={initBoard}
              className="px-6 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-400 text-center">
        Tip: Right-click on desktop or use the Flag Mode button on mobile to mark mines.
      </div>
    </div>
  );
};

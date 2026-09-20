import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Pause, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface SnakeGameProps {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Point {
  x: number;
  y: number;
}

interface FoodItem {
  x: number;
  y: number;
  type: 'normal' | 'gold' | 'speed';
  points: number;
  expiresAt?: number;
}

const GRID_SIZE = 22; // 22x22 cells

export const SnakeGame: React.FC<SnakeGameProps> = ({ soundEnabled, onGameOver, highScore }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [portalMode, setPortalMode] = useState(false);
  const [speedLevel, setSpeedLevel] = useState<'Normal' | 'Fast' | 'Hyper'>('Normal');

  // Snake coordinates
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const dirRef = useRef<Direction>('UP');
  const nextDirRef = useRef<Direction>('UP');
  const foodRef = useRef<FoodItem>({ x: 10, y: 5, type: 'normal', points: 10 });
  const specialFoodRef = useRef<FoodItem | null>(null);
  const lastEatTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);

  const getSpeedMs = useCallback(() => {
    switch (speedLevel) {
      case 'Hyper': return 75;
      case 'Fast': return 100;
      case 'Normal':
      default: return 125;
    }
  }, [speedLevel]);

  // Generate random empty position
  const getRandomEmptyPos = useCallback((snake: Point[]): Point => {
    let pt: Point;
    let collision: boolean;
    do {
      pt = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      collision = snake.some((s) => s.x === pt.x && s.y === pt.y);
    } while (collision);
    return pt;
  }, []);

  const spawnFood = useCallback((snake: Point[]) => {
    const pos = getRandomEmptyPos(snake);
    foodRef.current = {
      x: pos.x,
      y: pos.y,
      type: 'normal',
      points: 10,
    };

    // Chance to spawn special gold / speed food
    if (Math.random() < 0.35 && !specialFoodRef.current) {
      const specialPos = getRandomEmptyPos([...snake, pos]);
      const isGold = Math.random() < 0.6;
      specialFoodRef.current = {
        x: specialPos.x,
        y: specialPos.y,
        type: isGold ? 'gold' : 'speed',
        points: isGold ? 35 : 25,
        expiresAt: Date.now() + 7000,
      };
    }
  }, [getRandomEmptyPos]);

  const startGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    dirRef.current = 'UP';
    nextDirRef.current = 'UP';
    scoreRef.current = 0;
    setScore(0);
    setCombo(1);
    setIsDead(false);
    setIsPaused(false);
    setIsPlaying(true);
    specialFoodRef.current = null;
    spawnFood(snakeRef.current);
    SoundEffects.playClick(soundEnabled);
  }, [soundEnabled, spawnFood]);

  // Handle direction changing
  const changeDirection = useCallback((newDir: Direction) => {
    const current = dirRef.current;
    if (
      (newDir === 'UP' && current !== 'DOWN') ||
      (newDir === 'DOWN' && current !== 'UP') ||
      (newDir === 'LEFT' && current !== 'RIGHT') ||
      (newDir === 'RIGHT' && current !== 'LEFT')
    ) {
      nextDirRef.current = newDir;
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        if (isPlaying && !isDead) {
          setIsPaused((p) => !p);
        } else if (!isPlaying || isDead) {
          startGame();
        }
        return;
      }

      if (!isPlaying || isPaused || isDead) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, isDead, changeDirection, startGame]);

  // Game Loop
  useEffect(() => {
    if (!isPlaying || isPaused || isDead) return;

    const interval = setInterval(() => {
      const snake = [...snakeRef.current];
      const dir = nextDirRef.current;
      dirRef.current = dir;

      const head = { ...snake[0] };

      switch (dir) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Check wall collisions or wrapping
      if (portalMode) {
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;
      } else {
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          // Hit wall
          setIsDead(true);
          setIsPlaying(false);
          SoundEffects.playGameOver(soundEnabled);
          onGameOver(scoreRef.current);
          return;
        }
      }

      // Check self-collision
      const hitSelf = snake.some((seg) => seg.x === head.x && seg.y === head.y);
      if (hitSelf) {
        setIsDead(true);
        setIsPlaying(false);
        SoundEffects.playGameOver(soundEnabled);
        onGameOver(scoreRef.current);
        return;
      }

      snake.unshift(head);

      // Check food pickup
      let hasEaten = false;
      let earnedPoints = 0;

      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        hasEaten = true;
        earnedPoints = foodRef.current.points;
        spawnFood(snake);
      } else if (
        specialFoodRef.current &&
        head.x === specialFoodRef.current.x &&
        head.y === specialFoodRef.current.y
      ) {
        hasEaten = true;
        earnedPoints = specialFoodRef.current.points;
        specialFoodRef.current = null;
      }

      if (hasEaten) {
        const now = Date.now();
        const timeDiff = now - lastEatTimeRef.current;
        lastEatTimeRef.current = now;

        let nextCombo = 1;
        if (timeDiff < 2500) {
          nextCombo = Math.min(5, combo + 1);
        }
        setCombo(nextCombo);

        const totalEarned = earnedPoints * nextCombo;
        scoreRef.current += totalEarned;
        setScore(scoreRef.current);

        SoundEffects.playEat(soundEnabled);

        // High score trigger confetti
        if (scoreRef.current > highScore && highScore > 0 && scoreRef.current - totalEarned <= highScore) {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        }
      } else {
        snake.pop();
      }

      // Expire special food if needed
      if (specialFoodRef.current && specialFoodRef.current.expiresAt && Date.now() > specialFoodRef.current.expiresAt) {
        specialFoodRef.current = null;
      }

      snakeRef.current = snake;
    }, getSpeedMs());

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isDead, portalMode, soundEnabled, getSpeedMs, onGameOver, highScore, combo, spawnFood]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // Dark futuristic cyberspace background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // Grid mesh lines
      ctx.strokeStyle = '#151e30';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(width, i * cellSize);
        ctx.stroke();
      }

      // Border glow
      ctx.strokeStyle = portalMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Draw normal food
      const food = foodRef.current;
      const fx = food.x * cellSize + cellSize / 2;
      const fy = food.y * cellSize + cellSize / 2;
      const foodRadius = cellSize * 0.38;

      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner gleam
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(fx - 2, fy - 2, foodRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw special food if active
      if (specialFoodRef.current) {
        const sf = specialFoodRef.current;
        const sfx = sf.x * cellSize + cellSize / 2;
        const sfy = sf.y * cellSize + cellSize / 2;
        const isGold = sf.type === 'gold';
        const color = isGold ? '#f59e0b' : '#38bdf8';

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = color;

        // Pulsing diamond
        const pulse = Math.sin(Date.now() / 150) * 2;
        const size = cellSize * 0.4 + pulse;

        ctx.beginPath();
        ctx.moveTo(sfx, sfy - size);
        ctx.lineTo(sfx + size, sfy);
        ctx.lineTo(sfx, sfy + size);
        ctx.lineTo(sfx - size, sfy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw Snake
      const snake = snakeRef.current;
      snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        const sx = seg.x * cellSize;
        const sy = seg.y * cellSize;
        const padding = 1.5;

        ctx.save();
        if (isHead) {
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#34d399';
          // Head rounded
          const r = 5;
          ctx.beginPath();
          ctx.roundRect(sx + padding, sy + padding, cellSize - padding * 2, cellSize - padding * 2, r);
          ctx.fill();

          // Cyber eyes
          ctx.fillStyle = '#064e3b';
          const eyeSize = 2.5;
          let e1x = sx + 5, e1y = sy + 5, e2x = sx + cellSize - 8, e2y = sy + 5;
          if (dirRef.current === 'DOWN') {
            e1y = sy + cellSize - 7;
            e2y = sy + cellSize - 7;
          } else if (dirRef.current === 'LEFT') {
            e1x = sx + 5; e2x = sx + 5;
            e1y = sy + 5; e2y = sy + cellSize - 8;
          } else if (dirRef.current === 'RIGHT') {
            e1x = sx + cellSize - 7; e2x = sx + cellSize - 7;
            e1y = sy + 5; e2y = sy + cellSize - 8;
          }
          ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
          ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
        } else {
          // Body gradient / fade to tail
          const alpha = Math.max(0.4, 1 - idx / (snake.length + 5));
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(sx + padding + 1, sy + padding + 1, cellSize - (padding * 2 + 2), cellSize - (padding * 2 + 2), 3);
          ctx.fill();
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [portalMode]);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Top Game Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Score</div>
            <div className="text-2xl font-black text-emerald-400 font-mono flex items-center gap-2">
              {score}
              {combo > 1 && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold animate-pulse">
                  {combo}x Combo
                </span>
              )}
            </div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
          </div>
        </div>

        {/* Options & Controls */}
        <div className="flex items-center gap-2">
          <button
            id="snake-portal-toggle"
            onClick={() => setPortalMode(!portalMode)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
              portalMode
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="When active, passing through screen edges teleports snake to opposite side"
          >
            Portal: {portalMode ? 'ON' : 'OFF'}
          </button>

          <select
            id="snake-speed-select"
            value={speedLevel}
            onChange={(e) => setSpeedLevel(e.target.value as 'Normal' | 'Fast' | 'Hyper')}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1 outline-none focus:border-emerald-500"
          >
            <option value="Normal">Normal Speed</option>
            <option value="Fast">Fast Speed</option>
            <option value="Hyper">Hyper Speed</option>
          </select>

          {isPlaying && (
            <button
              id="snake-pause-btn"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          )}

          <button
            id="snake-restart-btn"
            onClick={startGame}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area with overlays */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0a0e17] aspect-square w-full max-w-[480px]">
        <canvas
          ref={canvasRef}
          width={480}
          height={480}
          className="w-full h-full block"
        />

        {/* Start Overlay */}
        {!isPlaying && !isDead && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Ready to Hunt?</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              Use arrow keys or swipe to guide the cyber snake. Capture neon orbs to grow!
            </p>
            <button
              id="snake-start-btn"
              onClick={startGame}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Start Game
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && !isDead && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-white mb-3">Game Paused</div>
            <button
              onClick={() => setIsPaused(false)}
              className="px-5 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-400"
            >
              <Play className="w-4 h-4 fill-current" /> Resume
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isDead && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-1">Crash Detected</div>
            <h3 className="text-3xl font-black text-white mb-2">Game Over</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 my-4 flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">{score}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div>
                <div className="text-xs text-slate-400">Best Score</div>
                <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
              </div>
            </div>
            <button
              id="snake-play-again-btn"
              onClick={startGame}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* On-screen D-pad for mobile / touch */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          onClick={() => changeDirection('UP')}
          className="w-14 h-12 bg-slate-800 active:bg-emerald-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => changeDirection('LEFT')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => changeDirection('DOWN')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
          <button
            onClick={() => changeDirection('RIGHT')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

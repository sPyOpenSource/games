import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Pause, Trophy, Heart, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface BreakoutGameProps {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  isExplosive?: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: 'multiball' | 'laser' | 'wide' | 'life';
  label: string;
  color: string;
}

interface LaserBolt {
  x: number;
  y: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 520;

export const BreakoutGame: React.FC<BreakoutGameProps> = ({ soundEnabled, onGameOver, highScore }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // State refs for animation loop
  const paddleRef = useRef({
    x: CANVAS_WIDTH / 2 - 45,
    y: CANVAS_HEIGHT - 35,
    w: 90,
    h: 12,
    speed: 8,
    hasLaser: false,
    laserTimer: 0,
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const lasersRef = useRef<LaserBolt[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysPressed = useRef<{ left: boolean; right: boolean; space: boolean }>({
    left: false,
    right: false,
    space: false,
  });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);

  // Build Bricks layout based on level
  const createLevelBricks = useCallback((lvl: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = 5 + (lvl - 1);
    const cols = 8;
    const padding = 6;
    const brickW = (CANVAS_WIDTH - 40 - (cols - 1) * padding) / cols;
    const brickH = 18;
    const startY = 60;

    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Level variations
        if (lvl === 2 && (r + c) % 3 === 0) continue; // patterned
        if (lvl === 3 && (r % 2 === 1 && c % 2 === 1)) continue;

        const x = 20 + c * (brickW + padding);
        const y = startY + r * (brickH + padding);
        const isArmored = lvl > 1 && r === 0;
        const isExplosive = (r === 2 && (c === 2 || c === 5));

        bricks.push({
          x,
          y,
          w: brickW,
          h: brickH,
          hp: isArmored ? 2 : 1,
          maxHp: isArmored ? 2 : 1,
          color: isExplosive ? '#ef4444' : colors[r % colors.length],
          isExplosive,
        });
      }
    }
    return bricks;
  }, []);

  const resetBall = useCallback(() => {
    const p = paddleRef.current;
    ballsRef.current = [
      {
        x: p.x + p.w / 2,
        y: p.y - 10,
        vx: (Math.random() - 0.5) * 4,
        vy: -5,
        radius: 6,
        speed: 5.5,
      },
    ];
  }, []);

  const startLevel = useCallback((lvl: number) => {
    levelRef.current = lvl;
    setLevel(lvl);
    bricksRef.current = createLevelBricks(lvl);
    powerUpsRef.current = [];
    lasersRef.current = [];
    paddleRef.current.w = 90;
    paddleRef.current.hasLaser = false;
    resetBall();
  }, [createLevelBricks, resetBall]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setHasWon(false);
    setIsPaused(false);
    setIsPlaying(true);
    startLevel(1);
    SoundEffects.playClick(soundEnabled);
  }, [soundEnabled, startLevel]);

  // Handle paddle mouse/touch move
  const handlePointerMove = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const mouseX = (clientX - rect.left) * scaleX;

    const p = paddleRef.current;
    p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.w, mouseX - p.w / 2));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressed.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressed.current.right = true;
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        if (!isPlaying || isGameOver) {
          startGame();
        } else {
          // shoot laser if active
          if (paddleRef.current.hasLaser) {
            const p = paddleRef.current;
            lasersRef.current.push(
              { x: p.x + 8, y: p.y - 4, vy: -7 },
              { x: p.x + p.w - 8, y: p.y - 4, vy: -7 }
            );
            SoundEffects.playBounce(soundEnabled);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysPressed.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysPressed.current.right = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isPlaying, isGameOver, startGame, soundEnabled]);

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const createParticles = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          size: Math.random() * 3 + 2,
        });
      }
    };

    const spawnPowerUp = (x: number, y: number) => {
      if (Math.random() > 0.3) return; // 30% drop chance
      const rand = Math.random();
      let type: PowerUp['type'] = 'multiball';
      let label = 'M';
      let color = '#06b6d4';

      if (rand < 0.3) {
        type = 'multiball';
        label = 'M';
        color = '#06b6d4';
      } else if (rand < 0.6) {
        type = 'laser';
        label = 'L';
        color = '#ef4444';
      } else if (rand < 0.85) {
        type = 'wide';
        label = 'W';
        color = '#10b981';
      } else {
        type = 'life';
        label = '+1';
        color = '#ec4899';
      }

      powerUpsRef.current.push({
        x,
        y,
        vy: 2.2,
        type,
        label,
        color,
      });
    };

    const updateGame = () => {
      if (!isPlaying || isPaused || isGameOver || hasWon) return;

      const p = paddleRef.current;

      // Handle keyboard paddle move
      if (keysPressed.current.left) {
        p.x = Math.max(0, p.x - p.speed);
      }
      if (keysPressed.current.right) {
        p.x = Math.min(CANVAS_WIDTH - p.w, p.x + p.speed);
      }

      // Decrement laser timer
      if (p.hasLaser && p.laserTimer > 0) {
        p.laserTimer--;
        if (p.laserTimer <= 0) p.hasLaser = false;
      }

      // Update Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const l = lasersRef.current[i];
        l.y += l.vy;

        // Brick collision with laser
        let hit = false;
        for (let bIdx = bricksRef.current.length - 1; bIdx >= 0; bIdx--) {
          const b = bricksRef.current[bIdx];
          if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
            hit = true;
            b.hp--;
            createParticles(l.x, l.y, '#ef4444', 4);
            if (b.hp <= 0) {
              scoreRef.current += 20;
              setScore(scoreRef.current);
              spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
              bricksRef.current.splice(bIdx, 1);
            }
            break;
          }
        }

        if (hit || l.y < 0) {
          lasersRef.current.splice(i, 1);
        }
      }

      // Update PowerUps
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        pu.y += pu.vy;

        // Check catch by paddle
        if (
          pu.y + 10 >= p.y &&
          pu.y - 10 <= p.y + p.h &&
          pu.x >= p.x &&
          pu.x <= p.x + p.w
        ) {
          SoundEffects.playEat(soundEnabled);
          if (pu.type === 'multiball') {
            const first = ballsRef.current[0] || { x: p.x + p.w / 2, y: p.y - 10, speed: 5.5 };
            ballsRef.current.push(
              { x: first.x, y: first.y, vx: -4, vy: -4.5, radius: 6, speed: 5.5 },
              { x: first.x, y: first.y, vx: 4, vy: -4.5, radius: 6, speed: 5.5 }
            );
          } else if (pu.type === 'wide') {
            p.w = 135;
          } else if (pu.type === 'laser') {
            p.hasLaser = true;
            p.laserTimer = 400; // ~6 seconds
          } else if (pu.type === 'life') {
            livesRef.current = Math.min(5, livesRef.current + 1);
            setLives(livesRef.current);
          }
          powerUpsRef.current.splice(i, 1);
        } else if (pu.y > CANVAS_HEIGHT) {
          powerUpsRef.current.splice(i, 1);
        }
      }

      // Update Balls
      for (let bIdx = ballsRef.current.length - 1; bIdx >= 0; bIdx--) {
        const ball = ballsRef.current[bIdx];
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
          SoundEffects.playBounce(soundEnabled);
        } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          SoundEffects.playBounce(soundEnabled);
        }

        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          SoundEffects.playBounce(soundEnabled);
        }

        // Paddle collision
        if (
          ball.y + ball.radius >= p.y &&
          ball.y - ball.radius <= p.y + p.h &&
          ball.x >= p.x &&
          ball.x <= p.x + p.w
        ) {
          ball.y = p.y - ball.radius;
          // Angle bounce based on strike position (-1 to 1)
          const hitOffset = (ball.x - (p.x + p.w / 2)) / (p.w / 2);
          const maxAngle = (Math.PI / 3); // 60 deg
          const bounceAngle = hitOffset * maxAngle;

          ball.vx = ball.speed * Math.sin(bounceAngle);
          ball.vy = -ball.speed * Math.cos(bounceAngle);

          SoundEffects.playBounce(soundEnabled);
          createParticles(ball.x, ball.y, '#38bdf8', 4);
        }

        // Brick collisions
        for (let i = bricksRef.current.length - 1; i >= 0; i--) {
          const brk = bricksRef.current[i];
          if (
            ball.x + ball.radius >= brk.x &&
            ball.x - ball.radius <= brk.x + brk.w &&
            ball.y + ball.radius >= brk.y &&
            ball.y - ball.radius <= brk.y + brk.h
          ) {
            // Hit brick!
            brk.hp--;
            ball.vy = -ball.vy;

            SoundEffects.playPop(soundEnabled, 1.4);
            createParticles(ball.x, ball.y, brk.color, 8);

            if (brk.isExplosive) {
              // Explode nearby bricks
              bricksRef.current.forEach((other) => {
                if (Math.hypot(other.x - brk.x, other.y - brk.y) < 70) {
                  other.hp = 0;
                  createParticles(other.x, other.y, other.color, 6);
                }
              });
            }

            if (brk.hp <= 0) {
              scoreRef.current += brk.maxHp * 20;
              setScore(scoreRef.current);
              spawnPowerUp(brk.x + brk.w / 2, brk.y + brk.h / 2);
              bricksRef.current.splice(i, 1);
            }
            break;
          }
        }

        // Ball falls off screen
        if (ball.y - ball.radius > CANVAS_HEIGHT) {
          ballsRef.current.splice(bIdx, 1);
        }
      }

      // If all balls lost
      if (ballsRef.current.length === 0) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setIsGameOver(true);
          SoundEffects.playGameOver(soundEnabled);
          onGameOver(scoreRef.current);
        } else {
          SoundEffects.playBounce(soundEnabled);
          resetBall();
        }
      }

      // Check level clear
      if (bricksRef.current.length === 0) {
        if (levelRef.current < 3) {
          SoundEffects.playWin(soundEnabled);
          startLevel(levelRef.current + 1);
        } else {
          setHasWon(true);
          SoundEffects.playWin(soundEnabled);
          confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 } });
          onGameOver(scoreRef.current + 500);
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha <= 0) particlesRef.current.splice(i, 1);
      }
    };

    const render = () => {
      updateGame();

      // Clear dark arcade canvas
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle cyber grid
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw Bricks
      bricksRef.current.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        if (b.hp < b.maxHp) {
          ctx.globalAlpha = 0.6;
        }
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();

        // Gleam on top
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 3);
        ctx.restore();
      });

      // Draw PowerUps
      powerUpsRef.current.forEach((pu) => {
        ctx.save();
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.label, pu.x, pu.y);
        ctx.restore();
      });

      // Draw Lasers
      lasersRef.current.forEach((l) => {
        ctx.save();
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.fillRect(l.x - 1.5, l.y - 8, 3, 10);
        ctx.restore();
      });

      // Draw Paddle
      const p = paddleRef.current;
      ctx.save();
      ctx.fillStyle = p.hasLaser ? '#ef4444' : '#06b6d4';
      ctx.shadowColor = p.hasLaser ? '#ef4444' : '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fill();

      // Inner gleam
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(p.x + 4, p.y + 2, p.w - 8, 3, 2);
      ctx.fill();
      ctx.restore();

      // Draw Balls
      ballsRef.current.forEach((ball) => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach((pt) => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isPaused, isGameOver, hasWon, soundEnabled, onGameOver, startLevel, resetBall]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Score</div>
            <div className="text-2xl font-black text-cyan-400 font-mono">{score}</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Level indicator */}
          <div className="text-xs font-bold px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Lvl {level}/3
          </div>

          {/* Lives display */}
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-colors ${
                  i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          {isPlaying && !isGameOver && !hasWon && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={startGame}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-[#080c14] w-full max-w-[480px] touch-none select-none"
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-auto block"
        />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && !hasWon && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Ready to Smash?</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              Move the paddle to bounce the sphere and demolish crystals. Catch falling power capsules!
            </p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Start Game
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-white mb-3">Paused</div>
            <button
              onClick={() => setIsPaused(false)}
              className="px-5 py-2 bg-cyan-500 text-slate-950 font-semibold rounded-lg text-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Resume
            </button>
          </div>
        )}

        {/* Victory Overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <Trophy className="w-16 h-16 text-amber-400 mb-3 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            <h3 className="text-3xl font-black text-white mb-1">Campaign Won!</h3>
            <p className="text-xs text-cyan-400 uppercase tracking-widest font-bold mb-4">All 3 Sectors Purified</p>
            <div className="text-2xl font-black text-cyan-300 font-mono mb-6">Score: {score}</div>
            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-500/25"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-1">Hull Breached</div>
            <h3 className="text-3xl font-black text-white mb-2">Game Over</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 my-4 flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="text-2xl font-black text-cyan-400 font-mono">{score}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div>
                <div className="text-xs text-slate-400">Best Score</div>
                <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-500/25"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile paddle buttons */}
      <div className="mt-4 flex items-center justify-center gap-6 sm:hidden w-full px-4">
        <button
          onTouchStart={() => (keysPressed.current.left = true)}
          onTouchEnd={() => (keysPressed.current.left = false)}
          className="flex-1 py-3 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onTouchStart={() => (keysPressed.current.right = true)}
          onTouchEnd={() => (keysPressed.current.right = false)}
          className="flex-1 py-3 bg-slate-800 active:bg-cyan-600 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

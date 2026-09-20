import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Trophy, Rocket, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface FlappyGameProps {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  width: number;
  passed: boolean;
  hasCoin: boolean;
  coinCollected: boolean;
  coinY: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 560;

export const FlappyGame: React.FC<FlappyGameProps> = ({ soundEnabled, onGameOver, highScore }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Plane physics state
  const planeRef = useRef({
    x: 80,
    y: 250,
    vy: 0,
    gravity: 0.38,
    jumpStrength: -6.8,
    radius: 14,
    rotation: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<SmokeParticle[]>([]);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);

  const spawnPipe = useCallback((startX: number) => {
    const gap = 140; // generous gap for fun
    const minHeight = 60;
    const maxHeight = CANVAS_HEIGHT - gap - minHeight - 40;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
    const bottomHeight = CANVAS_HEIGHT - topHeight - gap - 40;
    const hasCoin = Math.random() < 0.6;

    pipesRef.current.push({
      x: startX,
      topHeight,
      bottomHeight,
      gap,
      width: 55,
      passed: false,
      hasCoin,
      coinCollected: false,
      coinY: topHeight + gap / 2,
    });
  }, []);

  const jump = useCallback(() => {
    if (isGameOver) return;
    if (!isPlaying) {
      // Start game
      setIsPlaying(true);
      setIsGameOver(false);
      scoreRef.current = 0;
      setScore(0);
      planeRef.current.y = 250;
      planeRef.current.vy = planeRef.current.jumpStrength;
      pipesRef.current = [];
      spawnPipe(CANVAS_WIDTH + 50);
      spawnPipe(CANVAS_WIDTH + 260);
      SoundEffects.playJump(soundEnabled);
      return;
    }

    planeRef.current.vy = planeRef.current.jumpStrength;
    SoundEffects.playJump(soundEnabled);

    // Spawn smoke particles behind jet
    const p = planeRef.current;
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: p.x - 12,
        y: p.y + (Math.random() - 0.5) * 6,
        vx: -(Math.random() * 2 + 2),
        vy: (Math.random() - 0.5) * 2,
        alpha: 0.8,
        size: Math.random() * 4 + 2,
      });
    }
  }, [isPlaying, isGameOver, soundEnabled, spawnPipe]);

  const restartGame = useCallback(() => {
    setIsPlaying(false);
    setIsGameOver(false);
    planeRef.current.y = 250;
    planeRef.current.vy = 0;
    scoreRef.current = 0;
    setScore(0);
    pipesRef.current = [];
    particlesRef.current = [];
    SoundEffects.playClick(soundEnabled);
  }, [soundEnabled]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Main game animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      frameCountRef.current++;

      // Background Sky / Space Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#311042');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 25; i++) {
        const sx = ((i * 47) + frameCountRef.current * 0.2) % CANVAS_WIDTH;
        const sy = (i * 23) % (CANVAS_HEIGHT - 100);
        const radius = (i % 3 === 0) ? 1.5 : 1;
        ctx.fillRect(sx, sy, radius, radius);
      }

      // Distant city silhouette
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      for (let i = 0; i < 8; i++) {
        const bx = i * 60;
        const bh = 50 + ((i * 37) % 60);
        ctx.fillRect(bx, CANVAS_HEIGHT - 40 - bh, 55, bh);
      }

      const p = planeRef.current;

      if (isPlaying && !isGameOver) {
        // Physics
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (p.vy * 0.08)));

        // Floor / Ceiling collisions
        if (p.y + p.radius >= CANVAS_HEIGHT - 40) {
          p.y = CANVAS_HEIGHT - 40 - p.radius;
          setIsGameOver(true);
          SoundEffects.playGameOver(soundEnabled);
          onGameOver(scoreRef.current);
        }
        if (p.y - p.radius <= 0) {
          p.y = p.radius;
          p.vy = 0;
        }

        // Move Pipes
        const pipeSpeed = 2.4;
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= pipeSpeed;

          // Check pass for point
          if (!pipe.passed && pipe.x + pipe.width < p.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            SoundEffects.playEat(soundEnabled);

            if (scoreRef.current > highScore && highScore > 0 && scoreRef.current - 1 === highScore) {
              confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
            }
          }

          // Check coin pickup
          if (pipe.hasCoin && !pipe.coinCollected) {
            const coinDist = Math.hypot(p.x - (pipe.x + pipe.width / 2), p.y - pipe.coinY);
            if (coinDist < p.radius + 12) {
              pipe.coinCollected = true;
              scoreRef.current += 2;
              setScore(scoreRef.current);
              SoundEffects.playPop(soundEnabled, 2);
            }
          }

          // Check collision with top or bottom pipe
          const withinX = p.x + p.radius > pipe.x && p.x - p.radius < pipe.x + pipe.width;
          const hitTop = p.y - p.radius < pipe.topHeight;
          const hitBottom = p.y + p.radius > CANVAS_HEIGHT - 40 - pipe.bottomHeight;

          if (withinX && (hitTop || hitBottom)) {
            setIsGameOver(true);
            SoundEffects.playGameOver(soundEnabled);
            onGameOver(scoreRef.current);
          }

          // Remove offscreen pipes
          if (pipe.x + pipe.width < -20) {
            pipesRef.current.splice(i, 1);
          }
        }

        // Spawn new pipes
        const lastPipe = pipesRef.current[pipesRef.current.length - 1];
        if (lastPipe && lastPipe.x < CANVAS_WIDTH - 210) {
          spawnPipe(CANVAS_WIDTH + 20);
        }
      }

      // Draw Pipes (Cyber Gates)
      pipesRef.current.forEach((pipe) => {
        // Top pipe
        ctx.save();
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
        topGrad.addColorStop(0, '#7c3aed');
        topGrad.addColorStop(0.5, '#a855f7');
        topGrad.addColorStop(1, '#6b21a8');
        ctx.fillStyle = topGrad;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);

        // Top pipe cap
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(pipe.x - 3, pipe.topHeight - 12, pipe.width + 6, 12);

        // Bottom pipe
        const bY = CANVAS_HEIGHT - 40 - pipe.bottomHeight;
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, bY, pipe.width, pipe.bottomHeight);

        // Bottom cap
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(pipe.x - 3, bY, pipe.width + 6, 12);
        ctx.restore();

        // Draw Coin
        if (pipe.hasCoin && !pipe.coinCollected) {
          ctx.save();
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(pipe.x + pipe.width / 2, pipe.coinY, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', pipe.x + pipe.width / 2, pipe.coinY);
          ctx.restore();
        }
      });

      // Draw Ground
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - 40);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 40);
      ctx.stroke();

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.04;

        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(168, 85, 247, ${pt.alpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Jet Plane
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Jet Thruster Flame
      if (isPlaying && !isGameOver) {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-20 - Math.random() * 6, 0);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();
      }

      // Plane Body
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cockpit Glass
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(5, -3, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-12, 10);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isGameOver, soundEnabled, onGameOver, spawnPipe, highScore]);

  const getMedal = (s: number) => {
    if (s >= 50) return { name: 'Cyber Ace', color: 'text-amber-300' };
    if (s >= 25) return { name: 'Gold Pilot', color: 'text-amber-400' };
    if (s >= 10) return { name: 'Silver Wing', color: 'text-slate-300' };
    return null;
  };

  const medal = getMedal(score);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Gates Cleared</div>
            <div className="text-2xl font-black text-violet-400 font-mono">{score}</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
          </div>
        </div>

        <button
          onClick={restartGame}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Area */}
      <div
        onClick={jump}
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-[#0f172a] w-full max-w-[400px] cursor-pointer touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-auto block"
        />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mb-4 text-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.3)]">
              <Rocket className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Tap to Fly</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              Press Space or tap anywhere to ignite your thrusters. Thread through the neon energy towers!
            </p>
            <div className="px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-violet-500/25 transition flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" /> Tap or Press Space
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200"
          >
            <div className="text-xs uppercase tracking-widest font-bold text-rose-400 mb-1">Crashed</div>
            <h3 className="text-3xl font-black text-white mb-2">Flight Terminated</h3>

            {medal && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold mb-2">
                <Medal className={`w-4 h-4 ${medal.color}`} />
                <span className={medal.color}>{medal.name} Earned!</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 my-4 flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">Score</div>
                <div className="text-2xl font-black text-violet-400 font-mono">{score}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div>
                <div className="text-xs text-slate-400">Best</div>
                <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, score)}</div>
              </div>
            </div>

            <button
              onClick={jump}
              className="px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-violet-500/25"
            >
              <RotateCcw className="w-4 h-4" /> Flight Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Tip: Grab floating gold tokens for bonus points!
      </div>
    </div>
  );
};

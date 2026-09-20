import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Play, Trophy, Music, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoundEffects } from '../../utils/audio';

interface SimonGameProps {
  soundEnabled: boolean;
  onGameOver: (score: number) => void;
  highScore: number;
}

const COLORS = [
  { id: 0, label: 'Green', key: '1 / Q', bg: 'bg-emerald-500', activeBg: 'bg-emerald-300 shadow-[0_0_40px_rgba(52,211,153,0.8)] scale-98', border: 'border-emerald-400' },
  { id: 1, label: 'Red', key: '2 / W', bg: 'bg-rose-500', activeBg: 'bg-rose-300 shadow-[0_0_40px_rgba(251,113,133,0.8)] scale-98', border: 'border-rose-400' },
  { id: 2, label: 'Yellow', key: '3 / E', bg: 'bg-amber-400', activeBg: 'bg-amber-200 shadow-[0_0_40px_rgba(251,191,36,0.8)] scale-98', border: 'border-amber-300' },
  { id: 3, label: 'Blue', key: '4 / R', bg: 'bg-cyan-500', activeBg: 'bg-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.8)] scale-98', border: 'border-cyan-400' },
];

export const SimonGame: React.FC<SimonGameProps> = ({ soundEnabled, onGameOver, highScore }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [round, setRound] = useState(0);

  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  const flashPad = useCallback((padIndex: number, duration = 300) => {
    setActivePad(padIndex);
    SoundEffects.playSimonTone(padIndex, soundEnabled, duration / 1000);
    setTimeout(() => {
      setActivePad(null);
    }, duration);
  }, [soundEnabled]);

  const playSequence = useCallback((seq: number[]) => {
    clearAllTimeouts();
    setIsShowingSequence(true);

    const speed = Math.max(220, 600 - seq.length * 25);
    const gap = Math.max(120, 250 - seq.length * 10);

    seq.forEach((padIndex, idx) => {
      const delay = (speed + gap) * idx + 400;
      const t = setTimeout(() => {
        flashPad(padIndex, speed);
        if (idx === seq.length - 1) {
          setTimeout(() => {
            setIsShowingSequence(false);
          }, speed + 50);
        }
      }, delay);
      timeoutRefs.current.push(t);
    });
  }, [flashPad]);

  const nextRound = useCallback((currentSeq: number[]) => {
    const nextPad = Math.floor(Math.random() * 4);
    const newSeq = [...currentSeq, nextPad];
    setSequence(newSeq);
    setPlayerStep(0);
    setRound(newSeq.length);
    playSequence(newSeq);
  }, [playSequence]);

  const startGame = useCallback(() => {
    clearAllTimeouts();
    setIsGameOver(false);
    setIsPlaying(true);
    setSequence([]);
    setPlayerStep(0);
    setRound(1);
    nextRound([]);
    SoundEffects.playClick(soundEnabled);
  }, [soundEnabled, nextRound]);

  const handlePadClick = (padIndex: number) => {
    if (!isPlaying || isShowingSequence || isGameOver) return;

    flashPad(padIndex, 250);

    if (sequence[playerStep] === padIndex) {
      // Correct pad!
      const nextStep = playerStep + 1;

      if (nextStep === sequence.length) {
        // Round Complete!
        SoundEffects.playEat(soundEnabled);
        if (round > highScore && round - 1 === highScore) {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        }
        setTimeout(() => {
          nextRound(sequence);
        }, 800);
      } else {
        setPlayerStep(nextStep);
      }
    } else {
      // Wrong pad - Game Over
      setIsGameOver(true);
      setIsPlaying(false);
      SoundEffects.playGameOver(soundEnabled);
      onGameOver(Math.max(0, round - 1));
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isShowingSequence || isGameOver) return;
      switch (e.key) {
        case '1':
        case 'q':
        case 'Q':
          handlePadClick(0);
          break;
        case '2':
        case 'w':
        case 'W':
          handlePadClick(1);
          break;
        case '3':
        case 'e':
        case 'E':
          handlePadClick(2);
          break;
        case '4':
        case 'r':
        case 'R':
          handlePadClick(3);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Round</div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{isPlaying ? round : 0}</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </div>
            <div className="text-xl font-bold text-slate-200 font-mono">{Math.max(highScore, round - 1, 0)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying && (
            <button
              onClick={() => playSequence(sequence)}
              disabled={isShowingSequence}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                !isShowingSequence
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
              title="Replay sequence"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Replay</span>
            </button>
          )}

          <button
            onClick={startGame}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Circular Simon Console */}
      <div className="relative w-72 sm:w-80 aspect-square rounded-full p-4 bg-slate-950 border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
        {/* 4 Pads Grid */}
        <div className="w-full h-full rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 gap-3 p-1.5 bg-slate-900">
          {COLORS.map((col) => {
            const isActive = activePad === col.id;
            return (
              <button
                key={col.id}
                onClick={() => handlePadClick(col.id)}
                disabled={isShowingSequence || !isPlaying}
                className={`w-full h-full rounded-2xl transition-all duration-150 flex flex-col items-center justify-center cursor-pointer select-none ${
                  isActive ? col.activeBg : col.bg
                } ${
                  isShowingSequence || !isPlaying
                    ? 'opacity-85'
                    : 'hover:brightness-110 active:scale-95'
                }`}
              >
                <span className="text-[11px] font-mono font-black text-slate-950/70 uppercase">
                  {col.key}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center Orb HUD */}
        <div className="absolute w-28 h-28 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center p-2 text-center pointer-events-none">
          <Music className="w-5 h-5 text-indigo-400 mb-0.5" />
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            {isShowingSequence ? 'Watch' : isPlaying ? 'Repeat' : 'Simon'}
          </div>
          <div className="text-xl font-black text-white font-mono">
            {isPlaying ? round : '--'}
          </div>
        </div>

        {/* Start Game Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 rounded-full bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <h3 className="text-xl font-black text-white mb-2">Simon Blitz</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-[200px]">
              Memorize the musical pattern & repeat the sequence!
            </p>
            <button
              onClick={startGame}
              className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Start Game
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 rounded-full bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in zoom-in duration-200">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">Mistake!</div>
            <h3 className="text-xl font-black text-white mb-1">Game Over</h3>
            <div className="text-sm font-bold text-indigo-400 font-mono mb-4">
              Rounds: {Math.max(0, round - 1)}
            </div>
            <button
              onClick={startGame}
              className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-400 text-center">
        Tip: You can also use keys <span className="text-slate-200 font-mono">1-4</span> or <span className="text-slate-200 font-mono">Q-W-E-R</span> on your keyboard.
      </div>
    </div>
  );
};

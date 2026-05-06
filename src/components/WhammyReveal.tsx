import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SFX } from '@/lib/sfx';
import { X, AlertTriangle } from 'lucide-react';

interface WhammyRevealProps {
  studentName: string;
  baitPrizeName?: string;
  baitPrizeEmoji?: string;
  onClose: () => void;
}

type Stage = 'bait' | 'alarm' | 'stomp' | 'laugh';

/**
 * Multi-stage "Press Your Luck" bait-and-switch reveal:
 *  1. Bait (0–2s)   — show fake happy prize + chime
 *  2. Alarm (2–4s)  — red flashing background + siren
 *  3. Stomp (4–7s)  — fake prize shrinks, Whammy slides in from right
 *  4. Laugh (7s+)   — giant "WHAMMY!" text
 */
export const WhammyReveal = ({
  studentName,
  baitPrizeName = 'Homework Pass',
  baitPrizeEmoji = '📝',
  onClose,
}: WhammyRevealProps) => {
  const [stage, setStage] = useState<Stage>('bait');

  useEffect(() => {
    // Stage 1 — bait chime
    SFX.playCommonWin();

    const t1 = setTimeout(() => {
      setStage('alarm');
      SFX.lightning();
    }, 2000);

    const t2 = setTimeout(() => {
      setStage('stomp');
      SFX.spitefulLaugh();
    }, 4000);

    const t3 = setTimeout(() => {
      setStage('laugh');
      SFX.error();
    }, 7000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const isAlarmOrLater = stage !== 'bait';
  const isStompOrLater = stage === 'stomp' || stage === 'laugh';
  const isLaugh = stage === 'laugh';

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden transition-colors duration-300 ${
        isAlarmOrLater ? 'bg-red-900 animate-pulse' : 'bg-black/90'
      }`}
    >
      {/* Siren bar (alarm onward) */}
      {isAlarmOrLater && (
        <div className="absolute top-0 left-0 right-0 z-[63] flex items-center justify-center gap-4 bg-red-700 border-b-4 border-yellow-300 py-3 shadow-[0_0_60px_rgba(255,0,0,0.7)]">
          <div className="w-6 h-6 rounded-full bg-yellow-300 animate-ping" />
          <AlertTriangle className="w-8 h-8 text-yellow-300 animate-pulse" />
          <span className="font-display text-2xl tracking-[0.4em] text-yellow-200 drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
            ALERT — ALERT — ALERT
          </span>
          <AlertTriangle className="w-8 h-8 text-yellow-300 animate-pulse" />
          <div className="w-6 h-6 rounded-full bg-yellow-300 animate-ping" />
        </div>
      )}

      {/* Stage 1 / 2 — Bait prize (shrinks during stomp) */}
      <div
        className={`absolute z-[62] text-center transition-all duration-500 ${
          isStompOrLater ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="text-9xl drop-shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-bounce">
          {baitPrizeEmoji}
        </div>
        <h2 className="font-display text-5xl text-emerald-300 tracking-wider mt-4">
          {baitPrizeName}
        </h2>
        <p className="text-foreground/70 text-sm font-display uppercase tracking-widest mt-2">
          {studentName}
        </p>
      </div>

      {/* Stage 3 — Whammy slides in from the right */}
      <div
        className={`absolute z-[62] inset-0 flex items-center justify-center transition-transform duration-700 ease-out ${
          isStompOrLater ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="relative">
          {/* Spiky CSS shape backing */}
          <div
            className="absolute inset-0 -m-12 bg-red-600 animate-spin-slow"
            style={{
              clipPath:
                'polygon(50% 0%, 60% 18%, 80% 12%, 70% 32%, 95% 35%, 75% 50%, 95% 65%, 70% 68%, 80% 88%, 60% 82%, 50% 100%, 40% 82%, 20% 88%, 30% 68%, 5% 65%, 25% 50%, 5% 35%, 30% 32%, 20% 12%, 40% 18%)',
              filter: 'drop-shadow(0 0 30px rgba(255,0,0,0.8))',
            }}
          />
          <div className="relative text-[14rem] leading-none animate-bounce drop-shadow-[0_0_40px_rgba(255,0,0,0.9)]">
            👹
          </div>
        </div>
      </div>

      {/* Stage 4 — Giant jagged WHAMMY text */}
      {isLaugh && (
        <div className="absolute inset-0 z-[64] flex flex-col items-center justify-center pointer-events-none">
          <h1
            className="font-display text-[10rem] sm:text-[14rem] leading-none text-yellow-300 tracking-tighter animate-pulse"
            style={{
              textShadow:
                '0 0 30px rgba(255,0,0,1), 0 0 60px rgba(255,0,0,0.8), 6px 6px 0 #000, -6px -6px 0 #000',
              transform: 'rotate(-4deg) skewX(-6deg)',
            }}
          >
            WHAMMY!
          </h1>
          <p
            className="font-display text-3xl sm:text-5xl text-white tracking-widest mt-4 animate-bounce"
            style={{
              textShadow: '0 0 20px rgba(255,0,0,1), 4px 4px 0 #000',
              transform: 'rotate(2deg)',
            }}
          >
            YOU LOSE YOUR PRIZE!
          </p>
          <p className="text-yellow-200/80 text-sm font-display uppercase tracking-widest mt-6">
            {studentName}
          </p>
        </div>
      )}

      {/* Close button (only available after the laugh) */}
      {isLaugh && (
        <Button
          onClick={onClose}
          className="absolute bottom-8 z-[65] bg-black/60 border-2 border-yellow-300/60 text-yellow-200 hover:bg-black/80"
        >
          <X className="w-4 h-4 mr-1" />
          Dismiss
        </Button>
      )}
    </div>
  );
};

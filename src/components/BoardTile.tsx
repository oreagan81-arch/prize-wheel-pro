import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useBoardStore, type Tile, RARE_PRIZE_NAMES, REAGAN_TRAP_CHANCE, CONSOLATION_PRIZE } from '@/store/boardStore';
import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { SFX } from '@/lib/sfx';
import { callPrizeBoardAI } from '@/lib/ai';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import confetti from 'canvas-confetti';
import { Bomb, AlertTriangle, Loader2 } from 'lucide-react';

interface BoardTileProps {
  tileId: number;
}

const WHAMMY_TIMER = 10;

const REAGAN_WARNINGS = [
  "Wait... Reagan senses something...",
  "The crystal ball is trembling!",
  "Reagan is eyeing your prize...",
  "He's reaching for it!",
  "REAGAN IS HUNGRY!",
];

const BoardTileImpl = ({ tileId }: BoardTileProps) => {
  const tile = useBoardStore((s) => s.tiles.find((t) => t.id === tileId));
  const selectionMode = useBoardStore((s) => s.selectionMode);
  const selectedTiles = useBoardStore((s) => s.selectedTiles);
  const selectedStudent = useBoardStore((s) => s.selectedStudent);
  const toggleTileSelection = useBoardStore((s) => s.toggleTileSelection);
  const revealTile = useBoardStore((s) => s.revealTile);
  const trapTile = useBoardStore((s) => s.trapTile);
  const prizes = useBoardStore((s) => s.prizes);
  const useSpins = useBoardStore((s) => s.useSpins);
  const spins = useBoardStore((s) => s.spins);
  const ref = useRef<HTMLDivElement>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<{ name: string; emoji: string; rare: boolean } | null>(null);
  const [showBomb, setShowBomb] = useState(false);
  const [bombMessage, setBombMessage] = useState('');

  // Whammy Trap state — 3 phases: 'celebrate' → 'warning' → 'trapped'
  const [whammyPhase, setWhammyPhase] = useState<'idle' | 'celebrate' | 'warning' | 'trapped'>('idle');
  const [whammyTimer, setWhammyTimer] = useState(WHAMMY_TIMER);
  const [whammyPrize, setWhammyPrize] = useState<{ name: string; emoji: string } | null>(null);
  const [whammyTaunt, setWhammyTaunt] = useState('');
  const [whammyWarningIndex, setWhammyWarningIndex] = useState(0);

  // Mystery Box loading
  const [mysteryLoading, setMysteryLoading] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const isSelected = tile ? selectedTiles.includes(tile.id) : false;

  // Phase 1 → Phase 2 transition: after 3s of celebration, start warnings
  useEffect(() => {
    if (whammyPhase !== 'celebrate') return;
    const timeout = setTimeout(() => {
      setShowReveal(false); // close the fake prize overlay
      setWhammyPhase('warning');
      setWhammyTimer(WHAMMY_TIMER);
      setWhammyWarningIndex(0);
      SFX.error();
    }, 3000);
    return () => clearTimeout(timeout);
  }, [whammyPhase]);

  // Phase 2: warning countdown + escalating messages
  useEffect(() => {
    if (whammyPhase !== 'warning') return;
    const interval = setInterval(() => {
      setWhammyTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleWhammyResolve();
          return 0;
        }
        if (prev <= 4) SFX.lottoTick('E5');
        // Escalate warning messages
        const warningIdx = Math.min(
          Math.floor(((WHAMMY_TIMER - prev + 1) / WHAMMY_TIMER) * REAGAN_WARNINGS.length),
          REAGAN_WARNINGS.length - 1
        );
        setWhammyWarningIndex(warningIdx);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [whammyPhase]);

  const handleWhammyResolve = useCallback(async () => {
    SFX.spitefulLaugh();
    setWhammyPhase('trapped');

    const taunt = await callPrizeBoardAI('whammy_taunt');
    setWhammyTaunt(typeof taunt === 'string' ? taunt : "REAGAN DEVOURS YOUR PRIZE! Mwahaha!");

    trapTile(tile.id, CONSOLATION_PRIZE);

    confetti({
      particleCount: 50, spread: 60, origin: { y: 0.5 },
      colors: ['#ef4444', '#dc2626', '#991b1b']
    });
  }, [tile.id, trapTile]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current || tile.state !== 'empty') return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [tile.state, x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const rollPrize = useCallback(() => {
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = prizes[prizes.length - 1];
    for (const p of prizes) {
      roll -= p.weight;
      if (roll <= 0) { selected = p; break; }
    }
    return selected;
  }, [prizes]);

  const BOMB_EFFECTS = [
    { msg: "💣 BOOM! Lost 2 spins!", spinsLost: 2 },
    { msg: "💣 Oops! Lost 1 spin!", spinsLost: 1 },
    { msg: "💣 Kaboom! Lose a turn!", spinsLost: 0 },
    { msg: "💣 Lucky dud! No damage!", spinsLost: 0 },
    { msg: "💣 Triple trap! Lost 3 spins!", spinsLost: 3 },
  ];

  const handleClick = useCallback(async () => {
    if (tile.state === 'assigned' && !selectionMode) {
      if (tile.isBomb) {
        const effect = BOMB_EFFECTS[Math.floor(Math.random() * BOMB_EFFECTS.length)];
        setBombMessage(effect.msg);
        setShowBomb(true);
        if (effect.spinsLost > 0) useSpins(effect.spinsLost);
        revealTile(tile.id, '💣 BOMB');
        SFX.error();
        setTimeout(() => setShowBomb(false), 3000);
        return;
      }

      const prize = rollPrize();
      const emojiMatch = prize.name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
      const emoji = emojiMatch ? emojiMatch[0] : '🎁';

      let finalName = prize.name;
      if (prize.name.includes('Mystery Box')) {
        setMysteryLoading(true);
        const mystery = await callPrizeBoardAI('mystery_box');
        if (mystery && typeof mystery === 'string') {
          finalName = `✨ ${mystery.replace(/"/g, '')}`;
        }
        setMysteryLoading(false);
      }

      // Reagan Trap: 15% chance on rare prizes (Large 3D Print, Treasure Box)
      const isRarePrize = RARE_PRIZE_NAMES.includes(prize.name);
      const reaganTriggered = isRarePrize && Math.random() < REAGAN_TRAP_CHANCE;

      if (reaganTriggered) {
        // Phase 1: Celebrate — student thinks they won!
        revealTile(tile.id, finalName);
        setWhammyPrize({ name: finalName, emoji });
        setRevealedPrize({ name: finalName, emoji, rare: true });
        setShowReveal(true);
        setWhammyPhase('celebrate');

        SFX.prizeReveal();
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 }, colors: ['#fbbf24', '#f59e0b', '#10b981'] });
        return;
      }

      // Normal reveal
      revealTile(tile.id, finalName);
      setRevealedPrize({ name: finalName, emoji, rare: prize.tier === 'rare' });
      setShowReveal(true);

      SFX.prizeReveal();
      if (prize.tier === 'rare') {
        confetti({ particleCount: 300, spread: 120, origin: { y: 0.4 }, colors: ['#fbbf24', '#f59e0b'] });
      } else {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      return;
    }

    if (tile.state !== 'empty') return;
    if (selectionMode && selectedStudent) {
      const wasSelected = selectedTiles.includes(tile.id);
      toggleTileSelection(tile.id);
      if (wasSelected) SFX.deselect();
      else SFX.select();
    } else {
      SFX.click();
    }
  }, [tile, selectionMode, selectedStudent, selectedTiles, toggleTileSelection, rollPrize, revealTile, useSpins]);

  // --- RENDER: Overlays FIRST (always mounted), then tile ---
  const renderOverlays = () => (
    <>
      {/* Prize Reveal Overlay — persists across tile state changes */}
      {showReveal && revealedPrize && (
        <PrizeRevealOverlay
          open={showReveal}
          onClose={() => { setShowReveal(false); }}
          prizeName={revealedPrize.name}
          prizeEmoji={revealedPrize.emoji}
          studentName={tile.studentName || ''}
          isRare={revealedPrize.rare}
        />
      )}

      {/* Bomb Overlay */}
      {showBomb && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowBomb(false)}
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="glass-panel-strong p-8 rounded-2xl text-center space-y-4"
          >
            <div className="text-7xl">💣</div>
            <p className="text-destructive font-display text-xl">{bombMessage}</p>
            <p className="text-muted-foreground text-sm">Tap to dismiss</p>
          </motion.div>
        </motion.div>
      )}

      {/* Whammy Warning Phase (Phase 2) */}
      {whammyPhase === 'warning' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
        >
          {/* Red pulse background effect */}
          <motion.div
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="fixed inset-0 bg-destructive pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="glass-panel-strong p-8 rounded-2xl text-center space-y-4 max-w-md mx-4 z-[71] relative"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-7xl"
            >
              🧙
            </motion.div>
            <h3 className="font-display text-2xl text-destructive tracking-wider">⚠️ WHAMMY DETECTED!</h3>
            <p className="text-foreground text-sm">
              <span className="text-neon-amber font-bold">{whammyPrize?.emoji} {whammyPrize?.name}</span> is at risk!
            </p>
            <motion.p
              key={whammyWarningIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-neon-purple italic text-sm font-display"
            >
              {REAGAN_WARNINGS[whammyWarningIndex]}
            </motion.p>
            <div className="relative w-full h-4 bg-card/60 rounded-full overflow-hidden border border-destructive/30">
              <motion.div
                className="h-full bg-destructive rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${(whammyTimer / WHAMMY_TIMER) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className={`font-display text-4xl ${whammyTimer <= 3 ? 'text-destructive animate-pulse' : 'text-neon-amber'}`}>
              {whammyTimer}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Whammy Trapped Phase (Phase 3) */}
      {whammyPhase === 'trapped' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
        >
          <motion.div className="glass-panel-strong p-8 rounded-2xl text-center space-y-4 max-w-md mx-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-7xl spiteful-dance"
            >
              👹
            </motion.div>
            <h3 className="font-display text-2xl text-destructive tracking-wider">REAGAN DEVOURS IT!</h3>
            <p className="text-foreground/60 text-sm line-through">{whammyPrize?.emoji} {whammyPrize?.name}</p>
            <p className="text-neon-amber italic text-sm font-display">"{whammyTaunt}"</p>
            <div className="glass-panel p-3 rounded-lg border-destructive/20">
              <p className="text-xs text-muted-foreground">Consolation: 🎟️ +2 Stamps</p>
              <p className="text-xs text-destructive">-1 Class Spin deducted</p>
            </div>
            <button
              onClick={() => { setWhammyPhase('idle'); }}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 font-display uppercase tracking-widest"
            >
              Return to Board
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );

  // Tile not found (shouldn't happen but guards memo selector)
  if (!tile) return null;

  // Mystery Box loading state
  if (mysteryLoading) {
    return (
      <>
        {renderOverlays()}
        <div className="aspect-square rounded-lg bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-neon-purple animate-spin" />
        </div>
      </>
    );
  }

  // Revealed tile
  if (tile.state === 'revealed') {
    return (
      <>
        {renderOverlays()}
        <div className={`aspect-square rounded-lg flex items-center justify-center ${
          tile.prize === '💣 BOMB'
            ? 'bg-destructive/20 border border-destructive/30'
            : tile.isTrapped
            ? 'bg-destructive/10 border border-destructive/20 void-pulse'
            : 'bg-void/80 border border-white/5 void-pulse'
        }`}>
          <span className={`font-display text-xs ${
            tile.prize === '💣 BOMB' ? 'text-destructive/60' :
            tile.isTrapped ? 'text-destructive/40' :
            'text-muted-foreground/40'
          }`}>
            {tile.prize === '💣 BOMB' ? '💣' : tile.isTrapped ? '👹' : tile.id}
          </span>
        </div>
      </>
    );
  }

  // Assigned tile
  if (tile.state === 'assigned') {
    return (
      <>
        {renderOverlays()}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClick}
          className="aspect-square rounded-lg bg-card border border-neon-purple/30 flex flex-col items-center justify-center relative overflow-hidden neon-glow-purple cursor-pointer"
        >
          <div className="tile-shimmer absolute inset-0" />
          <span className="text-[10px] text-muted-foreground font-display relative z-10">{tile.id}</span>
          <span className="text-[10px] font-semibold text-neon-purple relative z-10 mt-0.5 truncate max-w-full px-1">
            {tile.studentName}
          </span>
        </motion.div>
      </>
    );
  }

  // Empty tile
  return (
    <>
      {renderOverlays()}
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`aspect-square rounded-lg border flex items-center justify-center cursor-pointer transition-colors duration-200
          ${isSelected
            ? 'bg-neon-emerald/20 border-neon-emerald/60 selection-glow'
            : 'bg-slate-800/60 backdrop-blur-md border-white/15 hover:border-neon-emerald/40 hover:bg-slate-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
          }
          ${selectionMode && selectedStudent ? 'ring-1 ring-neon-emerald/20' : ''}
        `}
      >
        <span className={`font-display text-2xl sm:text-3xl font-black ${isSelected ? 'text-neon-emerald drop-shadow-[0_2px_4px_rgba(16,185,129,0.5)]' : 'text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'}`}>
          {tile.id}
        </span>
      </motion.div>
    </>
  );
};

export const BoardTile = memo(BoardTileImpl);


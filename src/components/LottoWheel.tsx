import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';
import confetti from 'canvas-confetti';
import { X, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ITEM_HEIGHT = 100;
const VISIBLE_ITEMS = 3;

export const LottoWheel = () => {
  const { lottoOpen, setLottoOpen, tiles, spins, useSpins, revealTile, prizes } = useBoardStore();
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [landedTile, setLandedTile] = useState<{ id: number; studentName: string } | null>(null);
  const [stripOffset, setStripOffset] = useState(0);
  const [showPrize, setShowPrize] = useState(false);
  const [wonPrize, setWonPrize] = useState('');
  const stripItems = useRef<number[]>([]);

  const assignedTiles = tiles.filter((t) => t.state === 'assigned');

  const buildStrip = useCallback(() => {
    if (assignedTiles.length === 0) return [];
    const items: number[] = [];
    // Build a long strip of random assigned tile ids
    for (let i = 0; i < 60; i++) {
      items.push(assignedTiles[Math.floor(Math.random() * assignedTiles.length)].id);
    }
    return items;
  }, [assignedTiles]);

  const handleSpin = useCallback(async () => {
    if (spinning || assignedTiles.length === 0 || spins < 1) return;
    
    useSpins(1);
    setSpinning(true);
    setLanded(false);
    setLandedTile(null);
    setShowPrize(false);

    const items = buildStrip();
    stripItems.current = items;
    setStripOffset(0);

    await SFX.lottoSpin();

    // Pick a landing index near the end
    const landIdx = items.length - 8 + Math.floor(Math.random() * 5);
    const targetOffset = -(landIdx * ITEM_HEIGHT) + ITEM_HEIGHT; // center it

    // Animate with ticks
    const totalSteps = landIdx;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < totalSteps - 5) {
        SFX.lottoTick();
      } else if (step < totalSteps) {
        SFX.lottoTick('E5');
      }
      if (step >= totalSteps) {
        clearInterval(interval);
      }
    }, 80);

    // Set the final offset after a brief delay to start animation
    requestAnimationFrame(() => {
      setStripOffset(targetOffset);
    });

    // Wait for animation to complete
    setTimeout(async () => {
      clearInterval(interval);
      await SFX.lottoLand();
      
      const winId = items[landIdx];
      const winTile = tiles.find((t) => t.id === winId);
      if (winTile && winTile.state === 'assigned') {
        setLandedTile({ id: winTile.id, studentName: winTile.studentName || '' });
        setLanded(true);
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
        });
      }
      setSpinning(false);
    }, 4500);
  }, [spinning, assignedTiles, spins, useSpins, buildStrip, tiles]);

  const rollPrize = useCallback(() => {
    // Weighted random prize selection
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = prizes[prizes.length - 1];
    for (const p of prizes) {
      roll -= p.weight;
      if (roll <= 0) { selected = p; break; }
    }
    return selected;
  }, [prizes]);

  const handleShowPrize = useCallback(async () => {
    if (!landedTile) return;
    const prize = rollPrize();
    setWonPrize(prize.name);
    setShowPrize(true);
    revealTile(landedTile.id, prize.name);
    await SFX.prizeReveal();

    if (prize.tier === 'legendary') {
      confetti({
        particleCount: 300,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      });
    }
  }, [landedTile, rollPrize, revealTile]);

  const handleClose = () => {
    if (spinning) return;
    setLottoOpen(false);
    setLanded(false);
    setLandedTile(null);
    setShowPrize(false);
    setStripOffset(0);
  };

  if (!lottoOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="glass-panel-strong p-6 sm:p-8 rounded-2xl w-full max-w-md mx-4 relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl tracking-wider text-foreground">NUMBER DRAW</h2>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Wheel viewport */}
          <div className="relative mx-auto w-48 overflow-hidden rounded-xl border border-white/20 neon-glow-amber" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
            {/* Center indicator */}
            <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: ITEM_HEIGHT, height: ITEM_HEIGHT }}>
              <div className="w-full h-full border-y-2 border-neon-amber/60 bg-neon-amber/10" />
            </div>
            
            {/* Strip */}
            <div
              className="transition-transform duration-[4500ms] ease-[cubic-bezier(0.1,0,0,1)]"
              style={{ transform: `translateY(${stripOffset}px)` }}
            >
              {(stripItems.current.length > 0 ? stripItems.current : assignedTiles.map(t => t.id)).map((id, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center font-display text-3xl font-bold text-foreground"
                  style={{ height: ITEM_HEIGHT }}
                >
                  {id}
                </div>
              ))}
            </div>
          </div>

          {/* Result section */}
          <AnimatePresence mode="wait">
            {landed && !showPrize && landedTile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center space-y-3"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Square Occupied!</p>
                <p className="font-display text-2xl text-neon-amber font-bold">{landedTile.studentName}</p>
                <Button
                  onClick={handleShowPrize}
                  className="bg-neon-amber/20 border border-neon-amber/50 text-neon-amber hover:bg-neon-amber/30 font-display"
                >
                  Show Prize! 🎁
                </Button>
              </motion.div>
            )}

            {showPrize && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 text-center space-y-2"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Prize Won</p>
                <p className="font-display text-2xl text-neon-emerald font-bold">{wonPrize}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin button */}
          {!landed && (
            <div className="mt-6 text-center">
              <Button
                onClick={handleSpin}
                disabled={spinning || spins < 1 || assignedTiles.length === 0}
                className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 font-display text-lg px-8 py-3 disabled:opacity-30"
              >
                <Dices className="w-5 h-5 mr-2" />
                {spinning ? 'Spinning...' : `Spin (${spins})`}
              </Button>
              {assignedTiles.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No assigned tiles yet</p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

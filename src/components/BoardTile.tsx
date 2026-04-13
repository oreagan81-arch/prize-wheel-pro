import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useBoardStore, type Tile } from '@/store/boardStore';
import { useCallback, useRef, useState, useEffect } from 'react';
import { SFX } from '@/lib/sfx';
import { callPrizeBoardAI } from '@/lib/ai';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import confetti from 'canvas-confetti';
import { Bomb, AlertTriangle, Loader2 } from 'lucide-react';

interface BoardTileProps {
  tile: Tile;
}

const WHAMMY_TIMER = 10; // seconds

export const BoardTile = ({ tile }: BoardTileProps) => {
  const { selectionMode, selectedTiles, selectedStudent, toggleTileSelection, revealTile, trapTile, prizes, useSpins, spins } = useBoardStore();
  const ref = useRef<HTMLDivElement>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<{ name: string; emoji: string; rare: boolean } | null>(null);
  const [showBomb, setShowBomb] = useState(false);
  const [bombMessage, setBombMessage] = useState('');

  // Whammy Trap state
  const [whammyActive, setWhammyActive] = useState(false);
  const [whammyTimer, setWhammyTimer] = useState(WHAMMY_TIMER);
  const [whammyResult, setWhammyResult] = useState<'pending' | 'trapped' | 'safe'>('pending');
  const [whammyPrize, setWhammyPrize] = useState<{ name: string; emoji: string } | null>(null);
  const [whammyTaunt, setWhammyTaunt] = useState('');

  // Mystery Box loading
  const [mysteryLoading, setMysteryLoading] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const isSelected = selectedTiles.includes(tile.id);

  // Whammy timer countdown
  useEffect(() => {
    if (!whammyActive || whammyResult !== 'pending') return;
    const interval = setInterval(() => {
      setWhammyTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // TRAP SPRUNG!
          handleWhammyResolve();
          return 0;
        }
        if (prev <= 4) SFX.lottoTick('E5');
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [whammyActive, whammyResult]);

  const handleWhammyResolve = useCallback(async () => {
    // Reagan eats the prize!
    SFX.spitefulLaugh();
    setWhammyResult('trapped');
    
    // Get AI taunt
    const taunt = await callPrizeBoardAI('whammy_taunt');
    setWhammyTaunt(typeof taunt === 'string' ? taunt : "REAGAN DEVOURS YOUR PRIZE! Mwahaha!");
    
    // Consolation: +2 stamps, -1 spin
    trapTile(tile.id, '🎟️ +2 Stamps (Consolation)');
    
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
      // Check for bomb first
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

      // Check for Mystery Box — generate AI reward
      let finalName = prize.name;
      if (prize.name.includes('Mystery Box')) {
        setMysteryLoading(true);
        const mystery = await callPrizeBoardAI('mystery_box');
        if (mystery && typeof mystery === 'string') {
          finalName = `✨ ${mystery.replace(/"/g, '')}`;
        }
        setMysteryLoading(false);
      }

      // Check for Whammy Trap (only on rare/legendary with isTrap flag)
      if ((prize.tier === 'rare' || prize.tier === 'legendary') && tile.isTrap) {
        setWhammyPrize({ name: finalName, emoji });
        setWhammyActive(true);
        setWhammyTimer(WHAMMY_TIMER);
        setWhammyResult('pending');
        SFX.error();
        return;
      }

      // Normal reveal
      revealTile(tile.id, finalName);
      setRevealedPrize({ name: finalName, emoji, rare: prize.tier === 'legendary' });
      setShowReveal(true);
      
      SFX.prizeReveal();
      if (prize.tier === 'legendary') {
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

  // Whammy Trap overlay
  if (whammyActive) {
    return (
      <>
        <div className="aspect-square rounded-lg bg-destructive/20 border-2 border-destructive animate-pulse flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
        >
          <motion.div
            animate={whammyResult === 'pending' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="glass-panel-strong p-8 rounded-2xl text-center space-y-4 max-w-md mx-4"
          >
            {whammyResult === 'pending' ? (
              <>
                <motion.div
                  animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-7xl"
                >
                  ⚠️
                </motion.div>
                <h3 className="font-display text-2xl text-destructive tracking-wider">WHAMMY TRAP!</h3>
                <p className="text-foreground text-sm">
                  <span className="text-neon-amber font-bold">{whammyPrize?.name}</span> is at risk!
                </p>
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
                <p className="text-xs text-muted-foreground italic">Reagan is reaching for your prize...</p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-7xl spiteful-dance"
                >
                  👹
                </motion.div>
                <h3 className="font-display text-2xl text-destructive tracking-wider">REAGAN DEVOURS IT!</h3>
                <p className="text-neon-amber italic text-sm font-display">"{whammyTaunt}"</p>
                <div className="glass-panel p-3 rounded-lg border-destructive/20">
                  <p className="text-xs text-muted-foreground">Consolation: 🎟️ +2 Stamps</p>
                  <p className="text-xs text-destructive">-1 Class Spin deducted</p>
                </div>
                <button
                  onClick={() => { setWhammyActive(false); setWhammyResult('pending'); }}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2 font-display uppercase tracking-widest"
                >
                  Return to Board
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      </>
    );
  }

  // Mystery Box loading state
  if (mysteryLoading) {
    return (
      <div className="aspect-square rounded-lg bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (tile.state === 'revealed') {
    return (
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
    );
  }

  if (tile.state === 'assigned') {
    return (
      <>
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
        {showReveal && revealedPrize && (
          <PrizeRevealOverlay
            open={showReveal}
            onClose={() => setShowReveal(false)}
            prizeName={revealedPrize.name}
            prizeEmoji={revealedPrize.emoji}
            studentName={tile.studentName || ''}
            isRare={revealedPrize.rare}
          />
        )}
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
      </>
    );
  }

  // Empty tile
  return (
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
          : 'bg-white/10 backdrop-blur-md border-white/15 hover:border-neon-emerald/40 hover:bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
        }
        ${selectionMode && selectedStudent ? 'ring-1 ring-neon-emerald/20' : ''}
      `}
    >
      <span className={`font-display text-sm font-bold ${isSelected ? 'text-neon-emerald' : 'text-foreground/40'}`}>
        {tile.id}
      </span>
    </motion.div>
  );
};

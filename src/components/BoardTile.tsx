import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useBoardStore, type Tile } from '@/store/boardStore';
import { useCallback, useRef, useState } from 'react';
import { SFX } from '@/lib/sfx';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import confetti from 'canvas-confetti';
import { Bomb } from 'lucide-react';

interface BoardTileProps {
  tile: Tile;
}

export const BoardTile = ({ tile }: BoardTileProps) => {
  const { selectionMode, selectedTiles, selectedStudent, toggleTileSelection, revealTile, prizes, useSpins, spins } = useBoardStore();
  const ref = useRef<HTMLDivElement>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<{ name: string; emoji: string; rare: boolean } | null>(null);
  const [showBomb, setShowBomb] = useState(false);
  const [bombMessage, setBombMessage] = useState('');

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const isSelected = selectedTiles.includes(tile.id);

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

  const handleClick = useCallback(() => {
    if (tile.state === 'assigned' && !selectionMode) {
      // Check for bomb
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
      
      revealTile(tile.id, prize.name);
      setRevealedPrize({ name: prize.name, emoji, rare: prize.tier === 'legendary' });
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

  if (tile.state === 'revealed') {
    return (
      <div className={`aspect-square rounded-lg flex items-center justify-center ${
        tile.prize === '💣 BOMB' 
          ? 'bg-destructive/20 border border-destructive/30' 
          : 'bg-void/80 border border-white/5 void-pulse'
      }`}>
        <span className={`font-display text-xs ${tile.prize === '💣 BOMB' ? 'text-destructive/60' : 'text-muted-foreground/40'}`}>
          {tile.prize === '💣 BOMB' ? '💣' : tile.id}
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
          : 'bg-card/40 border-white/10 hover:border-neon-emerald/30 hover:bg-card/60'
        }
        ${selectionMode && selectedStudent ? 'ring-1 ring-neon-emerald/20' : ''}
      `}
    >
      <span className={`font-display text-sm font-bold ${isSelected ? 'text-neon-emerald' : 'text-muted-foreground/60'}`}>
        {tile.id}
      </span>
    </motion.div>
  );
};

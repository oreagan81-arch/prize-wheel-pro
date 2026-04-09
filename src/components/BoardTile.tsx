import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useBoardStore, type Tile } from '@/store/boardStore';
import { useCallback, useRef, useState } from 'react';
import { SFX } from '@/lib/sfx';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import confetti from 'canvas-confetti';

interface BoardTileProps {
  tile: Tile;
}

export const BoardTile = ({ tile }: BoardTileProps) => {
  const { selectionMode, selectedTiles, selectedStudent, toggleTileSelection, revealTile, prizes } = useBoardStore();
  const ref = useRef<HTMLDivElement>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedPrize, setRevealedPrize] = useState<{ name: string; emoji: string; rare: boolean } | null>(null);

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

  const handleClick = useCallback(() => {
    if (tile.state === 'assigned' && !selectionMode) {
      // Click assigned tile to reveal
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
  }, [tile, selectionMode, selectedStudent, selectedTiles, toggleTileSelection, rollPrize, revealTile]);

  if (tile.state === 'revealed') {
    return (
      <div className="aspect-square rounded-lg bg-void/80 border border-white/5 flex items-center justify-center void-pulse">
        <span className="text-muted-foreground/40 font-display text-xs">{tile.id}</span>
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

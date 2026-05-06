import { motion, AnimatePresence } from 'framer-motion';
import { SFX } from '@/lib/sfx';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useEffect } from 'react';
import { callPrizeBoardAI } from '@/lib/ai';
import type { PrizeDefinition, Rarity } from '@/store/boardStore';

interface PrizeRevealOverlayProps {
  open: boolean;
  onClose: () => void;
  prizeName: string;
  prizeEmoji?: string;
  studentName: string;
  isRare: boolean;
  /** Optional full prize definition — drives rarity-based celebrations */
  prize?: PrizeDefinition;
}

export const PrizeRevealOverlay = ({
  open,
  onClose,
  prizeName,
  prizeEmoji,
  studentName,
  isRare,
  prize,
}: PrizeRevealOverlayProps) => {
  const [blessing, setBlessing] = useState<string | null>(null);
  const [loadingBlessing, setLoadingBlessing] = useState(false);

  // Derive rarity from prize prop, fallback to legacy isRare flag
  const rarity: Rarity = prize?.rarity ?? (isRare ? 'rare' : 'common');
  const isWhammy = !!prize?.isWhammy;

  // Play rarity-based win SFX on mount (skip whammies)
  useEffect(() => {
    if (!open || isWhammy) return;
    if (rarity === 'legendary') SFX.playLegendaryWin();
    else if (rarity === 'rare') SFX.playRareWin();
    else SFX.playCommonWin();
  }, [open, rarity, isWhammy]);

  const handleGetBlessing = useCallback(async () => {
    setLoadingBlessing(true);
    const result = await callPrizeBoardAI('blessing');
    if (result) {
      setBlessing(typeof result === 'string' ? result.replace(/"/g, '') : String(result));
    } else {
      setBlessing('The veil is cloudy... Reagan cannot see.');
    }
    setLoadingBlessing(false);
    await SFX.mystical();
  }, []);

  const handleClose = () => {
    setBlessing(null);
    onClose();
  };

  if (!open) return null;

  // ============== Rarity-driven styles ==============
  const showSunburst = rarity === 'legendary' && !isWhammy;

  const backdropClass =
    rarity === 'legendary'
      ? 'bg-black/95'
      : rarity === 'rare'
      ? 'bg-black/85'
      : 'bg-black/80';

  const cardClass =
    rarity === 'legendary'
      ? 'relative z-[62] text-center space-y-5 max-w-2xl mx-4 p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-yellow-300/5 to-amber-500/10 ring-4 ring-yellow-400 shadow-[0_0_120px_rgba(251,191,36,0.55)]'
      : rarity === 'rare'
      ? 'relative z-[62] text-center space-y-4 max-w-md mx-4 p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 ring-4 ring-yellow-400 animate-pulse-slow shadow-[0_0_60px_rgba(251,191,36,0.4)]'
      : 'relative z-[62] text-center space-y-4 max-w-sm mx-4 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 ring-2 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.35)]';

  const motionInitial =
    rarity === 'legendary'
      ? { scale: 0.2, opacity: 0, rotate: -8 }
      : rarity === 'rare'
      ? { y: 120, opacity: 0, scale: 0.85 }
      : { scale: 0.6, opacity: 0 };

  const motionAnimate =
    rarity === 'legendary'
      ? { scale: 1, opacity: 1, rotate: 0 }
      : rarity === 'rare'
      ? { y: 0, opacity: 1, scale: 1 }
      : { scale: 1, opacity: 1 };

  const motionTransition =
    rarity === 'legendary'
      ? { type: 'spring' as const, damping: 10, stiffness: 140, duration: 0.8 }
      : rarity === 'rare'
      ? { type: 'spring' as const, damping: 14, stiffness: 180, duration: 0.6 }
      : { type: 'spring' as const, damping: 18, stiffness: 260 };

  const prizeImageClass =
    rarity === 'legendary'
      ? 'text-9xl drop-shadow-[0_0_30px_rgba(251,191,36,0.9)] animate-bounce'
      : rarity === 'rare'
      ? 'text-8xl drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]'
      : 'text-7xl drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]';

  const titleClass =
    rarity === 'legendary'
      ? 'font-display text-5xl sm:text-6xl tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent'
      : rarity === 'rare'
      ? 'font-display text-4xl text-yellow-300 tracking-wider'
      : 'font-display text-3xl text-emerald-300 tracking-wider';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[60] flex items-center justify-center ${backdropClass}`}
        onClick={handleClose}
      >
        {/* Flash effect for rare/legendary */}
        {(rarity === 'rare' || rarity === 'legendary') && !isWhammy && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-white z-[61] pointer-events-none"
          />
        )}

        {/* Legendary rotating sunburst */}
        {showSunburst && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="w-[1600px] h-[1600px] animate-spin-slow"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(251,191,36,0.55), rgba(251,191,36,0) 12deg, rgba(251,191,36,0.55) 24deg, rgba(251,191,36,0) 36deg, rgba(251,191,36,0.55) 48deg, rgba(251,191,36,0) 60deg, rgba(251,191,36,0.55) 72deg, rgba(251,191,36,0) 84deg, rgba(251,191,36,0.55) 96deg, rgba(251,191,36,0) 108deg, rgba(251,191,36,0.55) 120deg, rgba(251,191,36,0) 132deg, rgba(251,191,36,0.55) 144deg, rgba(251,191,36,0) 156deg, rgba(251,191,36,0.55) 168deg, rgba(251,191,36,0) 180deg, rgba(251,191,36,0.55) 192deg, rgba(251,191,36,0) 204deg, rgba(251,191,36,0.55) 216deg, rgba(251,191,36,0) 228deg, rgba(251,191,36,0.55) 240deg, rgba(251,191,36,0) 252deg, rgba(251,191,36,0.55) 264deg, rgba(251,191,36,0) 276deg, rgba(251,191,36,0.55) 288deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.55) 312deg, rgba(251,191,36,0) 324deg, rgba(251,191,36,0.55) 336deg, rgba(251,191,36,0) 348deg)',
                maskImage:
                  'radial-gradient(circle, transparent 110px, black 130px, black 600px, transparent 800px)',
                WebkitMaskImage:
                  'radial-gradient(circle, transparent 110px, black 130px, black 600px, transparent 800px)',
              }}
            />
          </div>
        )}

        <motion.div
          initial={motionInitial}
          animate={motionAnimate}
          transition={motionTransition}
          onClick={(e) => e.stopPropagation()}
          className={cardClass}
        >
          {prize?.imageUrl ? (
            <img
              src={prize.imageUrl}
              alt={prizeName}
              className={`${prizeImageClass} mx-auto rounded-2xl object-cover h-40 w-40 sm:h-48 sm:w-48`}
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          ) : (
            <div className={prizeImageClass}>{prizeEmoji || '🎁'}</div>
          )}

          <h2 className={titleClass}>{prizeName}</h2>

          <p className="text-foreground/70 text-sm font-display uppercase tracking-widest">
            {studentName}
          </p>

          {/* Blessing section */}
          {blessing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 rounded-xl"
            >
              <p className="text-xs text-muted-foreground font-display mb-1">
                ✨ Magnificent Blessing ✨
              </p>
              <p className="text-foreground italic text-sm">{blessing}</p>
            </motion.div>
          ) : (
            <Button
              onClick={handleGetBlessing}
              disabled={loadingBlessing}
              className="bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30"
            >
              {loadingBlessing ? '🔮 Channeling...' : '✨ Get Blessing'}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground mt-2"
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

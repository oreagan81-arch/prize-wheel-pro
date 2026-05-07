import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';
import reaganSpiteful from '@/assets/reagan-spiteful.png';

const AUTO_DISMISS_MS = 3500;

export const MissOverlay = () => {
  const boardSpinMode = useBoardStore((s) => s.boardSpinMode);
  const resetSpinMode = useBoardStore((s) => s.resetSpinMode);
  const isOpen = boardSpinMode === 'miss';

  useEffect(() => {
    if (!isOpen) return;
    SFX.playMiss();
    const t = setTimeout(() => resetSpinMode(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [isOpen, resetSpinMode]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={resetSpinMode}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 200 }}
            className="text-center space-y-5 max-w-md mx-4 p-8 rounded-3xl glass-panel-strong ring-2 ring-destructive/40 shadow-[0_0_60px_rgba(239,68,68,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={reaganSpiteful}
              alt="Reagan disappointed"
              animate={{ rotate: [0, -4, 4, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="mx-auto h-48 w-48 object-contain drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]"
            />
            <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-destructive">
              EMPTY!
            </h2>
            <p className="font-display text-lg text-foreground/80 tracking-widest">
              BETTER LUCK NEXT TIME!
            </p>
            <p className="text-xs text-muted-foreground/60 font-display uppercase tracking-widest">
              Tap anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { motion, AnimatePresence } from 'framer-motion';
import { SFX } from '@/lib/sfx';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { callPrizeBoardAI } from '@/lib/ai';

interface PrizeRevealOverlayProps {
  open: boolean;
  onClose: () => void;
  prizeName: string;
  prizeEmoji?: string;
  studentName: string;
  isRare: boolean;
}

export const PrizeRevealOverlay = ({ open, onClose, prizeName, prizeEmoji, studentName, isRare }: PrizeRevealOverlayProps) => {
  const [blessing, setBlessing] = useState<string | null>(null);
  const [loadingBlessing, setLoadingBlessing] = useState(false);

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
        onClick={handleClose}
      >
        {/* Flash effect for rare */}
        {isRare && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-white z-[61] pointer-events-none"
          />
        )}

        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="text-center space-y-4 z-[62] max-w-sm mx-4"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-8xl"
          >
            {prizeEmoji || '🎁'}
          </motion.div>

          <h2 className="font-display text-3xl sm:text-4xl text-neon-amber tracking-wider">
            {prizeName}
          </h2>

          <p className="text-foreground/60 text-sm font-display uppercase tracking-widest">
            {studentName}
          </p>

          {/* Blessing section */}
          {blessing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 rounded-xl"
            >
              <p className="text-xs text-muted-foreground font-display mb-1">✨ Magnificent Blessing ✨</p>
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

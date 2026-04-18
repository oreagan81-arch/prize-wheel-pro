import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Ghost, Skull } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SFX } from '@/lib/sfx';

interface WhammyOverlayProps {
  fakePrize: string;
  onComplete: () => void;
}

const TAUNTS = [
  "Wait... Reagan senses something...",
  "Reagan is reaching for your prize!",
  "The Magnificent one is hungry...",
  "Your rewards belong to the Void now!",
  "REAGAN HAS CLAIMED YOUR PRIZE!"
];

export const WhammyOverlay = ({ fakePrize, onComplete }: WhammyOverlayProps) => {
  const [countdown, setCountdown] = useState(10);
  const [tauntIndex, setTauntIndex] = useState(0);

  useEffect(() => {
    SFX.warningAlert(); // Start the ominous siren/sound
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Escalating taunts based on timer
  useEffect(() => {
    if (countdown > 8) setTauntIndex(0);
    else if (countdown > 5) setTauntIndex(1);
    else if (countdown > 2) setTauntIndex(2);
    else if (countdown > 0) setTauntIndex(3);
    else setTauntIndex(4);
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-red-950/90 backdrop-blur-md">
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute inset-0 bg-red-600/20"
      />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative text-center space-y-6 p-8"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <ShieldAlert className="w-24 h-24 text-red-500 mx-auto" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-4xl font-display text-white tracking-tighter uppercase italic">
            Whammy Trap!
          </h2>
          <p className="text-red-400 font-mono text-xl animate-pulse">
            {TAUNTS[tauntIndex]}
          </p>
        </div>

        <div className="glass-panel-strong p-6 border-red-500/50">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Targeting Prize:</p>
          <p className="text-2xl text-white font-bold line-through opacity-50">{fakePrize}</p>
        </div>

        <div className="text-6xl font-display text-red-500 tabular-nums">
          {countdown}s
        </div>
      </motion.div>
    </div>
  );
};

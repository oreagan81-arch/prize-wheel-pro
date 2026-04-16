import { useBoardStore } from '@/store/boardStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const InventoryPanel = () => {
  const [open, setOpen] = useState(false);
  const tiles = useBoardStore((s) => s.tiles);

  const assigned = tiles.filter((t) => t.state === 'assigned' || t.state === 'revealed').length;
  const revealed = tiles.filter((t) => t.state === 'revealed').length;
  const total = tiles.length;
  const clearance = Math.round((assigned / total) * 100);

  // Count remaining prizes by name (assigned but not revealed)
  const counts: Record<string, number> = {};
  tiles.forEach((t) => {
    if (t.state !== 'revealed') {
      const key = t.state === 'assigned' ? (t.studentName || 'Assigned') : 'Empty';
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  const assignedCount = tiles.filter((t) => t.state === 'assigned').length;
  const emptyCount = tiles.filter((t) => t.state === 'empty').length;

  return (
    <>
      {/* Toggle button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="glass-panel border-white/10 text-muted-foreground hover:text-foreground"
      >
        <Package className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Loot</span>
        <span className="ml-1 text-xs text-neon-amber font-display">{clearance}%</span>
      </Button>

      {/* Slide-out panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 z-40 glass-panel-strong border-l border-white/10 p-4 overflow-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm tracking-widest text-foreground">REMAINING LOOT</h3>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Clearance</span>
                <span className="font-display text-neon-amber">{clearance}%</span>
              </div>
              <div className="h-2 rounded-full bg-card/60 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${clearance}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-neon-emerald to-neon-cyan"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between p-3 glass-panel rounded-lg">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Empty</span>
                <span className="bg-card px-2 py-0.5 rounded-full text-xs font-display text-foreground">{emptyCount}</span>
              </div>
              <div className="flex justify-between p-3 glass-panel rounded-lg border-neon-purple/20">
                <span className="text-xs font-bold uppercase text-neon-purple tracking-widest">Assigned</span>
                <span className="bg-neon-purple/20 px-2 py-0.5 rounded-full text-xs font-display text-neon-purple">{assignedCount}</span>
              </div>
              <div className="flex justify-between p-3 glass-panel rounded-lg border-neon-amber/20">
                <span className="text-xs font-bold uppercase text-neon-amber tracking-widest">Revealed</span>
                <span className="bg-neon-amber/20 px-2 py-0.5 rounded-full text-xs font-display text-neon-amber">{revealed}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

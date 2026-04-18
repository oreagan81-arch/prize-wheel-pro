import { useState } from 'react';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import { WhammyOverlay } from './WhammyOverlay';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';

export const BoardTile = ({ tile }: { tile: any }) => {
  const [showReveal, setShowReveal] = useState(false);
  const [whammyActive, setWhammyActive] = useState(false);
  const revealTile = useBoardStore((s) => s.revealTile);
  const trapTile = useBoardStore((s) => s.trapTile);

  const handleTileClick = () => {
    if (tile.state !== 'assigned') return;

    // PHASE 1: The Celebration (Fake-out)
    setShowReveal(true);
    SFX.prizeReveal();

    if (tile.isBomb || tile.isTrapped) {
      // PHASE 2: Trigger Whammy after 3 seconds of "fake" joy
      setTimeout(() => {
        setShowReveal(false); 
        setWhammyActive(true); 
      }, 3000);
    } else {
      // Normal non-trap reveal
      revealTile(tile.id, tile.prize);
    }
  };

  const handleWhammyComplete = () => {
    setWhammyActive(false);
    // Final Phase: Update database with the consolation prize
    trapTile(tile.id, "🎟️ +2 GP (Consolation)");
  };

  return (
    <>
      {/* --- 1. OVERLAYS (Pinned to top so they don't unmount) --- */}
      {showReveal && (
        <PrizeRevealOverlay
          open={showReveal}
          onClose={() => setShowReveal(false)}
          prizeName={tile.prize}
          studentName={tile.studentName}
          isRare={tile.prize?.includes('🏆') || tile.prize?.includes('📦')}
        />
      )}

      {whammyActive && (
        <WhammyOverlay 
          fakePrize={tile.prize} 
          onComplete={handleWhammyComplete} 
        />
      )}

      {/* --- 2. TILE VISUALS --- */}
      <div 
        onClick={handleTileClick}
        className={`
          w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300
          ${tile.state === 'empty' ? 'bg-slate-800/40 border border-white/5' : ''}
          ${tile.state === 'assigned' ? 'bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}
          ${tile.state === 'revealed' ? 'bg-slate-900 border border-white/10 opacity-60' : ''}
        `}
      >
        {/* ASSIGNED STATE: No-wrap with ellipsis for long names */}
        {tile.state === 'assigned' && (
          <span className="
            text-[10px] sm:text-xs 
            font-display text-neon-emerald uppercase 
            tracking-tighter text-center px-1 
            block w-full 
            whitespace-nowrap overflow-hidden text-ellipsis
          ">
            {tile.studentName}
          </span>
        )}
        
        {/* REVEALED STATE: Clean, truncated prize text */}
        {tile.state === 'revealed' && (
          <div className="text-center px-1 w-full">
            <span className="text-[10px] text-white/40 block line-through truncate">
              {tile.prize}
            </span>
            {tile.isTrapped && (
              <span className="text-[8px] text-red-500 font-bold uppercase block">
                Stolen
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

import { useState, useEffect } from 'react';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';
import { WhammyOverlay } from './WhammyOverlay'; // Assuming this exists or we'll create it
import { SFX } from '@/lib/sfx';

export const BoardTile = ({ tile, onReveal }) => {
  const [phase, setPhase] = useState<'idle' | 'celebrate' | 'warning' | 'trapped'>('idle');
  const [showReveal, setShowReveal] = useState(false);

  const handleClick = () => {
    if (tile.state !== 'assigned') return;

    // Phase 1: The "Fake Out" Celebration
    setShowReveal(true);
    setPhase('celebrate');
    SFX.prizeReveal(); 

    if (tile.isTrap) {
      // Phase 2: Start the Ominous Transition after 3 seconds
      setTimeout(() => {
        setPhase('warning');
        setShowReveal(false); // Close the happy prize popup
        SFX.warningAlert();    // Start the red pulsing/ominous sound
      }, 3000);

      // Phase 3: The Final Strike after 10 seconds total
      setTimeout(() => {
        setPhase('trapped');
        onReveal(tile.id, 'trapped'); // This tells the store/Supabase it's gone
        SFX.whammyTaunt();
      }, 10000);
    } else {
      // Normal reveal logic
      onReveal(tile.id, tile.prize);
    }
  };

  return (
    <>
      {/* --- OVERLAYS (Outside the conditionals so they persist) --- */}
      {showReveal && (
        <PrizeRevealOverlay 
          prize={tile.prize} 
          onClose={() => setShowReveal(false)} 
        />
      )}

      {phase === 'warning' && (
        <WhammyOverlay 
          phase="warning" 
          fakePrize={tile.prize} 
          message="Wait... Reagan senses something..."
        />
      )}

      {phase === 'trapped' && (
        <WhammyOverlay 
          phase="trapped" 
          message="REAGAN HAS CLAIMED YOUR PRIZE!" 
        />
      )}

      {/* --- TILE RENDERING --- */}
      <div 
        onClick={handleClick}
        className={`relative w-full h-full border rounded-lg transition-all 
          ${tile.state === 'revealed' ? 'bg-slate-900/50' : 'bg-slate-800'}
          ${phase === 'warning' ? 'animate-pulse border-red-500' : 'border-white/10'}`}
      >
        {tile.state === 'assigned' && <span className="text-white">{tile.studentName}</span>}
        {tile.state === 'revealed' && (
          <div className="flex flex-col items-center">
             <span className="text-xs text-muted-foreground line-through">{tile.prize}</span>
             <span className="text-red-500 font-bold">STOLEN</span>
          </div>
        )}
      </div>
    </>
  );
};

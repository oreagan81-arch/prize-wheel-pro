import { useEffect } from 'react'; // 1. ADD THIS IMPORT
import { useBoardStore } from '@/store/boardStore';
import { BoardGrid } from '@/components/BoardGrid';
import { BoardHeader } from '@/components/BoardHeader';
import { ConfigModal } from '@/components/ConfigModal';
import { ParticleBackground } from '@/components/ParticleBackground';
import { LottoWheel } from '@/components/LottoWheel';
import { ReaganGame } from '@/components/ReaganGame';

const Index = () => {
  // 2. ADD THESE LINES TO PULL IN THE DATABASE LOADER
  const loadFromDatabase = useBoardStore((state: any) => state.loadFromDatabase);
  const currentClass = useBoardStore((state: any) => state.currentClass);

  // 3. ADD THIS USEEFFECT BLOCK
  // This says: "When the app opens, or when the class changes, run the database loader."
  useEffect(() => {
    loadFromDatabase();
  }, [currentClass, loadFromDatabase]);

  // Everything below here stays exactly the same
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10 flex flex-col min-h-screen max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4 gap-3">
        <BoardHeader />
        <div className="glass-panel flex-1 overflow-auto">
          <BoardGrid />
        </div>
        <footer className="text-center text-[10px] text-muted-foreground/40 font-display tracking-widest py-1">
          ULTIMATE PRIZE BOARD PRO
        </footer>
      </div>
      <ConfigModal />
      <LottoWheel />
      <ReaganGame />
    </div>
  );
};

export default Index;

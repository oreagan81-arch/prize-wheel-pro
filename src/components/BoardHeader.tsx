import { useBoardStore } from '@/store/boardStore';
import { Button } from '@/components/ui/button';
import { Settings, Zap, Dices, Sparkles, UserPlus, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const BoardHeader = () => {
  const {
    roster,
    spins,
    selectedStudent,
    selectionMode,
    selectedTiles,
    selectStudent,
    confirmAssignment,
    setConfigOpen,
    setLottoOpen,
    setAiGameOpen,
  } = useBoardStore();

  return (
    <header className="glass-panel-strong px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center gap-3">
      {/* Title */}
      <div className="flex items-center gap-3 mr-auto">
        <Sparkles className="w-6 h-6 text-neon-amber" />
        <h1 className="text-lg sm:text-xl font-display font-bold tracking-wider bg-gradient-to-r from-neon-emerald via-neon-cyan to-neon-purple bg-clip-text text-transparent">
          PRIZE BOARD PRO
        </h1>
      </div>

      {/* Spins counter */}
      <div className="glass-panel px-3 py-1.5 flex items-center gap-2 neon-glow-amber">
        <Dices className="w-4 h-4 text-neon-amber" />
        <span className="font-display text-sm text-neon-amber font-bold">{spins}</span>
        <span className="text-xs text-muted-foreground">spins</span>
      </div>

      {/* Student selector / Fast Assign */}
      {roster.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedStudent ?? ''}
            onValueChange={(v) => selectStudent(v || null)}
          >
            <SelectTrigger className="w-36 sm:w-44 glass-panel border-neon-emerald/30 text-foreground">
              <UserPlus className="w-3.5 h-3.5 mr-1.5 text-neon-emerald" />
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent className="glass-panel-strong border-white/10">
              {roster.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectionMode && selectedTiles.length > 0 && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={confirmAssignment}
                className="bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30"
              >
                <Check className="w-4 h-4 mr-1" />
                {selectedTiles.length}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selectStudent(null)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAiGameOpen(true)}
          className="glass-panel border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 hover:text-neon-purple"
        >
          <Zap className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">AI Game</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLottoOpen(true)}
          className="glass-panel border-neon-amber/30 text-neon-amber hover:bg-neon-amber/10 hover:text-neon-amber"
        >
          <Dices className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Lotto</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setConfigOpen(true)}
          className="glass-panel border-white/10 text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

import { useState } from 'react';
import { useBoardStore } from '@/store/boardStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trophy, RotateCcw } from 'lucide-react';

function parseRoster(raw: string): string[] {
  const lines = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Extract first names
  const firstNames = lines.map((line) => {
    const parts = line.split(/\s+/);
    return { first: parts[0], lastInitial: parts[1]?.[0]?.toUpperCase() || '' };
  });

  // Count duplicates
  const counts: Record<string, number> = {};
  firstNames.forEach((n) => {
    counts[n.first] = (counts[n.first] || 0) + 1;
  });

  return firstNames.map((n) =>
    counts[n.first] > 1 && n.lastInitial
      ? `${n.first} ${n.lastInitial}.`
      : n.first
  );
}

export const ConfigModal = () => {
  const { configOpen, setConfigOpen, roster, setRoster, initBoard } = useBoardStore();
  const [rosterText, setRosterText] = useState(roster.join('\n'));

  const handleSaveRoster = () => {
    const parsed = parseRoster(rosterText);
    setRoster(parsed);
  };

  return (
    <Dialog open={configOpen} onOpenChange={setConfigOpen}>
      <DialogContent className="glass-panel-strong border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide text-foreground">
            Board Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="roster" className="mt-2">
          <TabsList className="glass-panel border-white/10 w-full">
            <TabsTrigger value="roster" className="flex-1 data-[state=active]:bg-neon-emerald/20 data-[state=active]:text-neon-emerald">
              <Users className="w-4 h-4 mr-1.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="prizes" className="flex-1 data-[state=active]:bg-neon-amber/20 data-[state=active]:text-neon-amber">
              <Trophy className="w-4 h-4 mr-1.5" />
              Prizes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Paste student names (one per line). Duplicate first names get last initials.
            </p>
            <Textarea
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
              placeholder={"John Smith\nJane Doe\nJohn Adams"}
              rows={8}
              className="bg-card/60 border-white/10 text-foreground placeholder:text-muted-foreground/40 font-mono text-sm"
            />
            <Button onClick={handleSaveRoster} className="w-full bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30">
              Save Roster ({parseRoster(rosterText).length} students)
            </Button>
          </TabsContent>

          <TabsContent value="prizes" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Prize economy is pre-configured. Customization coming soon.
            </p>
            <div className="space-y-1.5">
              {useBoardStore.getState().prizes.map((p, i) => (
                <div
                  key={i}
                  className={`glass-panel px-3 py-2 flex items-center justify-between text-sm ${
                    p.tier === 'legendary'
                      ? 'border-neon-amber/30'
                      : p.tier === 'rare'
                      ? 'border-neon-purple/30'
                      : 'border-white/5'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className={`text-xs font-display ${
                    p.tier === 'legendary'
                      ? 'text-neon-amber'
                      : p.tier === 'rare'
                      ? 'text-neon-purple'
                      : 'text-muted-foreground'
                  }`}>
                    {p.tier}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t border-white/10 pt-3 mt-2">
          <Button
            variant="ghost"
            onClick={initBoard}
            className="text-destructive/70 hover:text-destructive text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

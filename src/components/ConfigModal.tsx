import { useState } from 'react';
import { useBoardStore, classLabels } from '@/store/boardStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trophy, RotateCcw, Wand2, Loader2 } from 'lucide-react';
import { callPrizeBoardAI } from '@/lib/ai';
import { SFX } from '@/lib/sfx';

function parseRoster(raw: string): string[] {
  const lines = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const firstNames = lines.map((line) => {
    const parts = line.split(/\s+/);
    return { first: parts[0], lastInitial: parts[1]?.[0]?.toUpperCase() || '' };
  });

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
  const { configOpen, setConfigOpen, roster, setRoster, initBoard, regeneratePrizes } = useBoardStore();
  const [rosterText, setRosterText] = useState(roster.join('\n'));
  const [themeInput, setThemeInput] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleSaveRoster = () => {
    const parsed = parseRoster(rosterText);
    setRoster(parsed);
  };

  const handleGenerateTheme = async () => {
    if (!themeInput.trim()) return;
    setGenerating(true);
    try {
      const data = await callPrizeBoardAI('theme', themeInput.trim());
      if (data?.prizes && Array.isArray(data.prizes)) {
        const mapped = data.prizes.map((p: any) => ({
          name: `${p.emoji || '🎁'} ${p.name}`,
          weight: p.count || 5,
          tier: p.rare ? 'legendary' as const : (p.count <= 5 ? 'rare' as const : 'common' as const),
        }));
        regeneratePrizes(mapped);
        await SFX.prizeReveal();
      }
    } catch (err) {
      console.error('Theme generation failed:', err);
      await SFX.error();
    }
    setGenerating(false);
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
            {/* AI Theme Generator */}
            <div className="glass-panel p-3 rounded-xl space-y-2 border-neon-purple/20">
              <p className="text-xs font-display text-neon-purple tracking-wide">✨ AI REWARD THEME GENERATOR</p>
              <p className="text-[10px] text-muted-foreground">Enter a theme and AI will create a full reward set! (Resets board)</p>
              <div className="flex gap-2">
                <Input
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  placeholder="e.g. Space, Dinosaurs, Superheroes..."
                  className="bg-card/60 border-white/10 text-foreground text-sm flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateTheme()}
                />
                <Button
                  onClick={handleGenerateTheme}
                  disabled={generating || !themeInput.trim()}
                  className="bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Current prize pool:</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
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

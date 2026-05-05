import { useState } from 'react';
import { useBoardStore, type Rarity, type Roster, type PrizeDefinition } from '@/store/boardStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Skull, Trophy } from 'lucide-react';
import { SFX } from '@/lib/sfx';
import { toast } from 'sonner';

const ROSTER_OPTIONS: { value: Roster; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'homeroom', label: 'Homeroom' },
  { value: 'math', label: 'Math' },
  { value: 'reading', label: 'Reading' },
];

const RARITY_OPTIONS: Rarity[] = ['common', 'rare', 'legendary'];

const rarityClass = (r: Rarity) =>
  r === 'legendary'
    ? 'text-neon-amber border-neon-amber/30'
    : r === 'rare'
    ? 'text-neon-purple border-neon-purple/30'
    : 'text-muted-foreground border-white/10';

export const PrizeCreationMenu = () => {
  const { masterPrizes, addMasterPrize, deleteMasterPrize, toggleWhammy } = useBoardStore();

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [rarity, setRarity] = useState<Rarity>('common');
  const [rosters, setRosters] = useState<Roster[]>(['all']);
  const [isWhammy, setIsWhammy] = useState(false);
  const [stockCount, setStockCount] = useState<number>(5);

  const toggleRoster = (r: Roster, checked: boolean) => {
    setRosters((prev) => {
      if (checked) return Array.from(new Set([...prev, r]));
      return prev.filter((x) => x !== r);
    });
  };

  const resetForm = () => {
    setName('');
    setImageUrl('');
    setRarity('common');
    setRosters(['all']);
    setIsWhammy(false);
    setStockCount(5);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Prize name is required');
      return;
    }
    if (rosters.length === 0) {
      toast.error('Assign to at least one roster');
      return;
    }
    const prize: PrizeDefinition = {
      id: `prize_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      imageUrl: imageUrl.trim(),
      rarity,
      rosters,
      isWhammy,
      stockCount: Math.max(0, Number(stockCount) || 0),
    };
    addMasterPrize(prize);
    SFX.confirm();
    toast.success(`"${prize.name}" added`);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border-white/10 space-y-4">
        <p className="text-xs font-display text-neon-emerald tracking-wide">🎁 NEW PRIZE</p>

        <div className="space-y-1.5">
          <Label htmlFor="prize-name" className="text-xs text-muted-foreground">Prize Name</Label>
          <Input
            id="prize-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Extra Recess Pass"
            className="bg-card/60 border-white/10 text-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rarity</Label>
            <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity)}>
              <SelectTrigger className="bg-card/60 border-white/10 text-foreground capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel-strong border-white/10">
                {RARITY_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock" className="text-xs text-muted-foreground">Stock Count</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              value={stockCount}
              onChange={(e) => setStockCount(Number(e.target.value))}
              className="bg-card/60 border-white/10 text-foreground"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Assign to Rosters</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROSTER_OPTIONS.map((opt) => {
              const checked = rosters.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 glass-panel border-white/10 rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-card/40 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggleRoster(opt.value, !!c)}
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between glass-panel border-white/10 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Skull className={`w-4 h-4 ${isWhammy ? 'text-destructive' : 'text-muted-foreground'}`} />
            <Label htmlFor="whammy" className="text-sm text-foreground cursor-pointer">
              Whammy / Penalty?
            </Label>
          </div>
          <Switch id="whammy" checked={isWhammy} onCheckedChange={setIsWhammy} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="image-url" className="text-xs text-muted-foreground">Image URL (AI generation coming soon)</Label>
          <Input
            id="image-url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="bg-card/60 border-white/10 text-foreground"
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Save Prize
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-display text-muted-foreground tracking-wide uppercase">
            Master Prizes
          </p>
          <span className="text-[10px] text-muted-foreground">{masterPrizes.length} total</span>
        </div>

        {masterPrizes.length === 0 ? (
          <div className="glass-panel border-white/5 rounded-md px-3 py-6 text-center text-xs text-muted-foreground">
            No prizes yet — add your first above.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {masterPrizes.map((p) => (
              <div
                key={p.id}
                className={`glass-panel px-3 py-2 rounded-md border ${rarityClass(p.rarity)} flex items-center gap-2`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.isWhammy ? (
                      <Skull className="w-3.5 h-3.5 text-destructive shrink-0" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    )}
                    <span className="text-sm text-foreground truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-display capitalize">{p.rarity}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {p.rosters.join(', ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">· stock {p.stockCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Whammy</span>
                    <Switch
                      checked={p.isWhammy}
                      onCheckedChange={(c) => toggleWhammy(p.id, !!c)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      deleteMasterPrize(p.id);
                      toast.success('Prize removed');
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

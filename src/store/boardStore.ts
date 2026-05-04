import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type TileState = 'empty' | 'assigned' | 'revealed' | 'bomb';

export interface Tile {
  id: number;
  state: TileState;
  studentName?: string;
  prize?: string;
  isBomb?: boolean;
  isTrapped?: boolean;
}

export interface Prize {
  name: string;
  weight: number;
  tier: 'legendary' | 'rare' | 'common';
}

export type ClassName = 'homeroom' | 'math' | 'reading';

export type Rarity = 'common' | 'rare' | 'legendary';
export type Roster = 'all' | 'homeroom' | 'math' | 'reading';

export interface PrizeDefinition {
  id: string;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  rosters: Roster[];
  isWhammy: boolean;
  stockCount: number;
}

export interface ClassData {
  tiles: Tile[];
  roster: string[];
  prizes: Prize[];
  spins: number;
  curriculumTopic: string;
}

interface BoardState {
  currentClass: ClassName;
  classes: Record<ClassName, ClassData>;
  selectedStudent: string | null;
  selectionMode: boolean;
  selectedTiles: number[];
  pendingStudent: string | null;
  configOpen: boolean;
  lottoOpen: boolean;
  aiGameOpen: boolean;

  // Hydration tracking — true once loadFromDatabase has resolved for this class.
  // Prevents stale UI state from overwriting freshly loaded server data.
  hydratedClasses: Record<ClassName, boolean>;

  masterPrizes: PrizeDefinition[];

  // Derived accessors
  tiles: Tile[];
  roster: string[];
  prizes: Prize[];
  spins: number;
  curriculumTopic: string;

  // Actions
  switchClass: (name: ClassName) => void;
  initBoard: () => void;
  setRosterLocal: (names: string[]) => void;
  saveRoster: (names: string[]) => Promise<void>;
  selectStudent: (name: string | null) => void;
  toggleSelectionMode: () => void;
  toggleTileSelection: (id: number) => void;
  confirmAssignment: () => void;
  revealTile: (id: number, prize: string) => void;
  luckyStrike: () => number | null;
  trapTile: (id: number, consolation: string) => void;
  addSpins: (count: number) => void;
  useSpins: (count: number) => void;
  setPendingStudent: (name: string | null) => void;
  assignTileToStudent: (id: number, name: string) => boolean;
  setConfigOpen: (open: boolean) => void;
  setLottoOpen: (open: boolean) => void;
  setAiGameOpen: (open: boolean) => void;
  setPrizes: (prizes: Prize[]) => Promise<void>;
  regeneratePrizes: (newPrizes: Prize[]) => Promise<void>;
  setCurriculumTopic: (topic: string) => Promise<void>;

  addMasterPrize: (prize: PrizeDefinition) => void;
  updateMasterPrize: (id: string, updates: Partial<PrizeDefinition>) => void;
  deleteMasterPrize: (id: string) => void;
  toggleWhammy: (prizeId: string, isWhammy: boolean) => void;

  loadFromDatabase: (cls?: ClassName) => Promise<void>;
  isClassHydrated: (cls?: ClassName) => boolean;
}

const sharedPrizes: Prize[] = [
  { name: '🏆 Large 3D Print', weight: 2, tier: 'rare' },
  { name: '📦 Treasure Box', weight: 3, tier: 'rare' },
  { name: '🍕 Lunch with Friend', weight: 5, tier: 'common' },
  { name: '🪑 Prime Seat Pass', weight: 5, tier: 'common' },
  { name: '🖨️ Small 3D Print', weight: 5, tier: 'common' },
  { name: '🥢 Stick Box x 2', weight: 10, tier: 'common' },
  { name: '🧸 Stuffed Animal Pass', weight: 10, tier: 'common' },
  { name: '🪀 Toy at Recess', weight: 10, tier: 'common' },
  { name: '🎟️ +10 Stamps', weight: 15, tier: 'common' },
  { name: '🎫 +5 Stamps', weight: 25, tier: 'common' },
];

const classPrizeMap: Record<ClassName, Prize[]> = {
  homeroom: [
    ...sharedPrizes.slice(0, 5),
    { name: '🌅 Skip Morning Work', weight: 10, tier: 'common' },
    ...sharedPrizes.slice(5),
  ],
  math: [
    ...sharedPrizes.slice(0, 5),
    { name: '➗ Halfies Pass', weight: 10, tier: 'common' },
    ...sharedPrizes.slice(5),
  ],
  reading: [
    ...sharedPrizes.slice(0, 5),
    { name: '📖 No Comp Pass', weight: 10, tier: 'common' },
    ...sharedPrizes.slice(5),
  ],
};

export const RARE_PRIZE_NAMES = ['🏆 Large 3D Print', '📦 Treasure Box'];
export const REAGAN_TRAP_CHANCE = 0.15;
export const CONSOLATION_PRIZE = '🎟️ +2 Stamps (Consolation)';

const BOMB_CHANCE = 0.05;

const createEmptyTiles = (): Tile[] =>
  Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    state: 'empty' as TileState,
    isBomb: Math.random() < BOMB_CHANCE,
  }));

const createClassData = (cls: ClassName): ClassData => ({
  tiles: createEmptyTiles(),
  roster: [],
  prizes: [...classPrizeMap[cls]],
  spins: 0,
  curriculumTopic: '',
});

const CLASS_NAMES: ClassName[] = ['homeroom', 'math', 'reading'];

const classLabels: Record<ClassName, string> = {
  homeroom: '🏠 Homeroom',
  math: '🔢 Math',
  reading: '📖 Reading',
};

export { CLASS_NAMES, classLabels };

const updateClass = (
  state: BoardState,
  cls: ClassName,
  updater: (data: ClassData) => Partial<ClassData>
): Partial<BoardState> => {
  const current = state.classes[cls];
  const updates = updater(current);
  const newClassData = { ...current, ...updates };
  const newClasses = { ...state.classes, [cls]: newClassData };
  const patch: Partial<BoardState> = { classes: newClasses };
  if (cls === state.currentClass) {
    patch.tiles = newClassData.tiles;
    patch.roster = newClassData.roster;
    patch.prizes = newClassData.prizes;
    patch.spins = newClassData.spins;
    patch.curriculumTopic = newClassData.curriculumTopic;
  }
  return patch;
};

const updateCurrentClass = (state: BoardState, updater: (data: ClassData) => Partial<ClassData>) =>
  updateClass(state, state.currentClass, updater);

export const useBoardStore = create<BoardState>()((set, get) => {
  const initialClass: ClassName = 'homeroom';
  const initialClasses: Record<ClassName, ClassData> = {
    homeroom: createClassData('homeroom'),
    math: createClassData('math'),
    reading: createClassData('reading'),
  };

  // Kick off background hydration for the initial class.
  // (Done after store creation via setTimeout to avoid TDZ issues.)
  setTimeout(() => {
    get().loadFromDatabase(initialClass).catch((e) => console.error('Initial hydrate failed:', e));
  }, 0);

  return {
    currentClass: initialClass,
    classes: initialClasses,
    selectedStudent: null,
    selectionMode: false,
    selectedTiles: [],
    pendingStudent: null,
    configOpen: false,
    lottoOpen: false,
    aiGameOpen: false,
    hydratedClasses: { homeroom: false, math: false, reading: false },
    masterPrizes: [],

    tiles: initialClasses[initialClass].tiles,
    roster: initialClasses[initialClass].roster,
    prizes: initialClasses[initialClass].prizes,
    spins: initialClasses[initialClass].spins,
    curriculumTopic: initialClasses[initialClass].curriculumTopic,

    isClassHydrated: (cls) => get().hydratedClasses[cls ?? get().currentClass],

    switchClass: (name) => {
      const data = get().classes[name];
      set({
        currentClass: name,
        tiles: data.tiles,
        roster: data.roster,
        prizes: data.prizes,
        spins: data.spins,
        curriculumTopic: data.curriculumTopic,
        selectedStudent: null,
        selectionMode: false,
        selectedTiles: [],
      });
      // Refresh from DB if not yet hydrated for this class
      if (!get().hydratedClasses[name]) {
        get().loadFromDatabase(name).catch((e) => console.error('Switch hydrate failed:', e));
      }
    },

    initBoard: () =>
      set((s) => updateCurrentClass(s, () => ({ tiles: createEmptyTiles(), spins: 0 }))),

    // Local-only roster update (no DB write). Used by typing in the textarea.
    setRosterLocal: (names) =>
      set((s) => updateCurrentClass(s, () => ({ roster: names }))),

    // Explicit save: writes to DB. Throws on failure so UI can toast.
    saveRoster: async (names) => {
      const cls = get().currentClass;
      set((s) => updateClass(s, cls, () => ({ roster: names })));
      const { error } = await supabase
        .from('class_configs')
        .upsert({ class_id: cls, roster: names as unknown as any }, { onConflict: 'class_id' });
      if (error) {
        console.error('saveRoster failed:', error);
        throw error;
      }
    },

    selectStudent: (name) =>
      set({ selectedStudent: name, selectionMode: !!name, selectedTiles: [] }),

    toggleSelectionMode: () =>
      set((s) => ({ selectionMode: !s.selectionMode, selectedTiles: [] })),

    toggleTileSelection: (id) =>
      set((s) => {
        const tile = s.tiles.find((t) => t.id === id);
        if (!tile || tile.state !== 'empty') return s;
        const selected = s.selectedTiles.includes(id)
          ? s.selectedTiles.filter((t) => t !== id)
          : [...s.selectedTiles, id];
        return { selectedTiles: selected };
      }),

    confirmAssignment: () =>
      set((s) => {
        if (!s.selectedStudent || s.selectedTiles.length === 0) return s;
        const newTiles = s.tiles.map((t) =>
          s.selectedTiles.includes(t.id)
            ? { ...t, state: 'assigned' as TileState, studentName: s.selectedStudent! }
            : t
        );
        return {
          ...updateCurrentClass(s, () => ({ tiles: newTiles })),
          selectedStudent: null,
          selectionMode: false,
          selectedTiles: [],
        };
      }),

    revealTile: (id, prize) =>
      set((s) => {
        const newTiles = s.tiles.map((t) =>
          t.id === id ? { ...t, state: 'revealed' as TileState, prize } : t
        );
        return updateCurrentClass(s, () => ({ tiles: newTiles }));
      }),

    luckyStrike: () => {
      const s = get();
      if (!s.selectedStudent) return null;
      const emptyTiles = s.tiles.filter((t) => t.state === 'empty');
      if (emptyTiles.length === 0) return null;
      const target = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      const newTiles = s.tiles.map((t) =>
        t.id === target.id
          ? { ...t, state: 'assigned' as TileState, studentName: s.selectedStudent! }
          : t
      );
      set((st) => updateCurrentClass(st, () => ({ tiles: newTiles })));
      return target.id;
    },

    trapTile: (id, consolation) =>
      set((s) => {
        const newTiles = s.tiles.map((t) =>
          t.id === id ? { ...t, state: 'revealed' as TileState, prize: consolation, isTrapped: true } : t
        );
        const newSpins = Math.max(0, s.spins - 1);
        return updateCurrentClass(s, () => ({ tiles: newTiles, spins: newSpins }));
      }),

    addSpins: (count) =>
      set((s) => updateCurrentClass(s, () => ({ spins: s.spins + count }))),

    useSpins: (count) =>
      set((s) => updateCurrentClass(s, () => ({ spins: Math.max(0, s.spins - count) }))),

    setPendingStudent: (name) => set({ pendingStudent: name }),

    assignTileToStudent: (id, name) => {
      const s = get();
      const tile = s.tiles.find((t) => t.id === id);
      if (!tile || tile.state !== 'empty') return false;
      const newTiles = s.tiles.map((t) =>
        t.id === id ? { ...t, state: 'assigned' as TileState, studentName: name } : t
      );
      set((st) => ({
        ...updateCurrentClass(st, () => ({ tiles: newTiles })),
        pendingStudent: null,
      }));
      return true;
    },

    setConfigOpen: (open) => set({ configOpen: open }),
    setLottoOpen: (open) => set({ lottoOpen: open }),
    setAiGameOpen: (open) => set({ aiGameOpen: open }),

    setPrizes: async (prizes) => {
      const cls = get().currentClass;
      set((s) => updateClass(s, cls, () => ({ prizes })));
      const { error } = await supabase
        .from('class_configs')
        .upsert({ class_id: cls, prizes: prizes as unknown as any }, { onConflict: 'class_id' });
      if (error) throw error;
    },

    regeneratePrizes: async (newPrizes) => {
      const cls = get().currentClass;
      set((s) => updateClass(s, cls, () => ({ prizes: newPrizes, tiles: createEmptyTiles(), spins: 0 })));
      const { error } = await supabase
        .from('class_configs')
        .upsert({ class_id: cls, prizes: newPrizes as unknown as any }, { onConflict: 'class_id' });
      if (error) throw error;
    },

    setCurriculumTopic: async (topic) => {
      const cls = get().currentClass;
      set((s) => updateClass(s, cls, () => ({ curriculumTopic: topic })));
      const { error } = await supabase
        .from('class_configs')
        .upsert({ class_id: cls, curriculum_topic: topic }, { onConflict: 'class_id' });
      if (error) throw error;
    },

    loadFromDatabase: async (clsArg) => {
      const cls = clsArg ?? get().currentClass;
      const { data, error } = await supabase
        .from('class_configs')
        .select('*')
        .eq('class_id', cls)
        .maybeSingle();

      if (error) {
        console.error('Error loading config:', error);
        // Mark hydrated anyway so saves can proceed
        set((s) => ({ hydratedClasses: { ...s.hydratedClasses, [cls]: true } }));
        return;
      }

      if (data) {
        const roster = Array.isArray(data.roster) ? (data.roster as unknown as string[]) : [];
        const prizes = Array.isArray(data.prizes) && (data.prizes as unknown[]).length > 0
          ? (data.prizes as unknown as Prize[])
          : get().classes[cls].prizes;
        set((s) => ({
          ...updateClass(s, cls, () => ({
            roster,
            prizes,
            curriculumTopic: data.curriculum_topic || '',
          })),
          hydratedClasses: { ...s.hydratedClasses, [cls]: true },
        }));
      } else {
        set((s) => ({ hydratedClasses: { ...s.hydratedClasses, [cls]: true } }));
      }
    },
  };
});

import { create } from 'zustand';

export type TileState = 'empty' | 'assigned' | 'revealed' | 'bomb';

export interface Tile {
  id: number;
  state: TileState;
  studentName?: string;
  prize?: string;
  isBomb?: boolean;
}

export interface Prize {
  name: string;
  weight: number;
  tier: 'legendary' | 'rare' | 'common';
}

export type ClassName = 'homeroom' | 'math' | 'reading';

export interface ClassData {
  tiles: Tile[];
  roster: string[];
  prizes: Prize[];
  spins: number;
}

interface BoardState {
  currentClass: ClassName;
  classes: Record<ClassName, ClassData>;
  selectedStudent: string | null;
  selectionMode: boolean;
  selectedTiles: number[];
  configOpen: boolean;
  lottoOpen: boolean;
  aiGameOpen: boolean;

  // Derived accessors
  tiles: Tile[];
  roster: string[];
  prizes: Prize[];
  spins: number;

  // Actions
  switchClass: (name: ClassName) => void;
  initBoard: () => void;
  setRoster: (names: string[]) => void;
  selectStudent: (name: string | null) => void;
  toggleSelectionMode: () => void;
  toggleTileSelection: (id: number) => void;
  confirmAssignment: () => void;
  revealTile: (id: number, prize: string) => void;
  addSpins: (count: number) => void;
  useSpins: (count: number) => void;
  setConfigOpen: (open: boolean) => void;
  setLottoOpen: (open: boolean) => void;
  setAiGameOpen: (open: boolean) => void;
  setPrizes: (prizes: Prize[]) => void;
  regeneratePrizes: (newPrizes: Prize[]) => void;
}

const defaultPrizes: Prize[] = [
  { name: '🏆 Large 3D Print', weight: 1, tier: 'legendary' },
  { name: '📦 Treasure Box', weight: 2, tier: 'legendary' },
  { name: '👟 Shoes Off Day', weight: 3, tier: 'rare' },
  { name: '🎧 Music Pass', weight: 5, tier: 'rare' },
  { name: '🪑 Seat Swap', weight: 8, tier: 'rare' },
  { name: '⭐ +10 Stamps', weight: 15, tier: 'common' },
  { name: '✨ +5 Stamps', weight: 25, tier: 'common' },
];

const BOMB_CHANCE = 0.05;

const createEmptyTiles = (): Tile[] =>
  Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    state: 'empty' as TileState,
    isBomb: Math.random() < BOMB_CHANCE,
  }));

const createClassData = (): ClassData => ({
  tiles: createEmptyTiles(),
  roster: [],
  prizes: [...defaultPrizes],
  spins: 0,
});

const CLASS_NAMES: ClassName[] = ['homeroom', 'math', 'reading'];

const classLabels: Record<ClassName, string> = {
  homeroom: '🏠 Homeroom',
  math: '🔢 Math',
  reading: '📖 Reading',
};

export { CLASS_NAMES, classLabels };

// Helper to update the current class data
const updateCurrentClass = (state: BoardState, updater: (data: ClassData) => Partial<ClassData>): Partial<BoardState> => {
  const cls = state.currentClass;
  const current = state.classes[cls];
  const updates = updater(current);
  const newClassData = { ...current, ...updates };
  const newClasses = { ...state.classes, [cls]: newClassData };
  return {
    classes: newClasses,
    // Keep derived fields in sync
    tiles: newClassData.tiles,
    roster: newClassData.roster,
    prizes: newClassData.prizes,
    spins: newClassData.spins,
  };
};

export const useBoardStore = create<BoardState>((set, get) => {
  const initialClass: ClassName = 'homeroom';
  const initialClasses: Record<ClassName, ClassData> = {
    homeroom: createClassData(),
    math: createClassData(),
    reading: createClassData(),
  };

  return {
    currentClass: initialClass,
    classes: initialClasses,
    selectedStudent: null,
    selectionMode: false,
    selectedTiles: [],
    configOpen: false,
    lottoOpen: false,
    aiGameOpen: false,

    // Derived
    tiles: initialClasses[initialClass].tiles,
    roster: initialClasses[initialClass].roster,
    prizes: initialClasses[initialClass].prizes,
    spins: initialClasses[initialClass].spins,

    switchClass: (name) => {
      const data = get().classes[name];
      set({
        currentClass: name,
        tiles: data.tiles,
        roster: data.roster,
        prizes: data.prizes,
        spins: data.spins,
        selectedStudent: null,
        selectionMode: false,
        selectedTiles: [],
      });
    },

    initBoard: () =>
      set((s) => updateCurrentClass(s, () => ({ tiles: createEmptyTiles(), spins: 0 }))),

    setRoster: (names) =>
      set((s) => updateCurrentClass(s, () => ({ roster: names }))),

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
        const cls = s.currentClass;
        const newClassData = { ...s.classes[cls], tiles: newTiles };
        return {
          classes: { ...s.classes, [cls]: newClassData },
          tiles: newTiles,
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
        const cls = s.currentClass;
        const newClassData = { ...s.classes[cls], tiles: newTiles };
        return {
          classes: { ...s.classes, [cls]: newClassData },
          tiles: newTiles,
        };
      }),

    addSpins: (count) =>
      set((s) => {
        const newSpins = s.spins + count;
        const cls = s.currentClass;
        const newClassData = { ...s.classes[cls], spins: newSpins };
        return {
          classes: { ...s.classes, [cls]: newClassData },
          spins: newSpins,
        };
      }),

    useSpins: (count) =>
      set((s) => {
        const newSpins = Math.max(0, s.spins - count);
        const cls = s.currentClass;
        const newClassData = { ...s.classes[cls], spins: newSpins };
        return {
          classes: { ...s.classes, [cls]: newClassData },
          spins: newSpins,
        };
      }),

    setConfigOpen: (open) => set({ configOpen: open }),
    setLottoOpen: (open) => set({ lottoOpen: open }),
    setAiGameOpen: (open) => set({ aiGameOpen: open }),

    setPrizes: (prizes) =>
      set((s) => updateCurrentClass(s, () => ({ prizes }))),

    regeneratePrizes: (newPrizes) =>
      set((s) => updateCurrentClass(s, () => ({ prizes: newPrizes, tiles: createEmptyTiles(), spins: 0 }))),
  };
});

import { create } from 'zustand';

export type TileState = 'empty' | 'assigned' | 'revealed';

export interface Tile {
  id: number;
  state: TileState;
  studentName?: string;
  prize?: string;
}

export interface Prize {
  name: string;
  weight: number; // higher = more common
  tier: 'legendary' | 'rare' | 'common';
}

interface BoardState {
  tiles: Tile[];
  roster: string[];
  prizes: Prize[];
  selectedStudent: string | null;
  selectionMode: boolean;
  selectedTiles: number[];
  spins: number;
  configOpen: boolean;
  lottoOpen: boolean;
  aiGameOpen: boolean;

  // Actions
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

const createEmptyTiles = (): Tile[] =>
  Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    state: 'empty' as TileState,
  }));

export const useBoardStore = create<BoardState>((set, get) => ({
  tiles: createEmptyTiles(),
  roster: [],
  prizes: defaultPrizes,
  selectedStudent: null,
  selectionMode: false,
  selectedTiles: [],
  spins: 0,
  configOpen: false,
  lottoOpen: false,
  aiGameOpen: false,

  initBoard: () => set({ tiles: createEmptyTiles(), spins: 0 }),

  setRoster: (names) => set({ roster: names }),

  selectStudent: (name) => set({ selectedStudent: name, selectionMode: !!name, selectedTiles: [] }),

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
        tiles: newTiles,
        selectedStudent: null,
        selectionMode: false,
        selectedTiles: [],
      };
    }),

  revealTile: (id, prize) =>
    set((s) => ({
      tiles: s.tiles.map((t) =>
        t.id === id ? { ...t, state: 'revealed' as TileState, prize } : t
      ),
    })),

  addSpins: (count) => set((s) => ({ spins: s.spins + count })),
  useSpins: (count) => set((s) => ({ spins: Math.max(0, s.spins - count) })),

  setConfigOpen: (open) => set({ configOpen: open }),
  setLottoOpen: (open) => set({ lottoOpen: open }),
  setAiGameOpen: (open) => set({ aiGameOpen: open }),
  setPrizes: (prizes) => set({ prizes }),
}));

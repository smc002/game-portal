import { create } from 'zustand';
import type {
  GamePhase, GeneralInstance, MapNode,
} from '../data/types';

export interface Inventory {
  items: { itemId: string; count: number }[];
  gold: number;
}

export interface GameState {
  // -- Run state --
  phase: GamePhase;
  act: number; // 1-3
  party: GeneralInstance[];
  inventory: Inventory;

  // -- Map --
  mapNodes: MapNode[];
  currentNodeId: string | null;

  // -- Run result --
  won: boolean | null;

  // -- Actions --
  setPhase: (phase: GamePhase) => void;
  setAct: (act: number) => void;
  setParty: (party: GeneralInstance[]) => void;
  updateGeneral: (index: number, patch: Partial<GeneralInstance>) => void;
  setInventory: (inv: Inventory) => void;
  addItem: (itemId: string, count?: number) => void;
  removeItem: (itemId: string, count?: number) => void;
  addGold: (amount: number) => void;
  setMap: (nodes: MapNode[]) => void;
  setCurrentNode: (nodeId: string | null) => void;
  visitNode: (nodeId: string) => void;
  setWon: (won: boolean | null) => void;
  resetRun: () => void;
}

const INITIAL_INVENTORY: Inventory = {
  items: [
    { itemId: 'zhujian', count: 5 },
    { itemId: 'jinchuangyao', count: 3 },
  ],
  gold: 100,
};

export const useGameStore = create<GameState>((set) => ({
  phase: 'title',
  act: 1,
  party: [],
  inventory: { ...INITIAL_INVENTORY },
  mapNodes: [],
  currentNodeId: null,
  won: null,

  setPhase: (phase) => set({ phase }),
  setAct: (act) => set({ act }),
  setParty: (party) => set({ party }),
  updateGeneral: (index, patch) =>
    set((s) => {
      const party = [...s.party];
      party[index] = { ...party[index]!, ...patch };
      return { party };
    }),
  setInventory: (inventory) => set({ inventory }),
  addItem: (itemId, count = 1) =>
    set((s) => {
      const items = [...s.inventory.items];
      const idx = items.findIndex((i) => i.itemId === itemId);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, count: items[idx]!.count + count };
      } else {
        items.push({ itemId, count });
      }
      return { inventory: { ...s.inventory, items } };
    }),
  removeItem: (itemId, count = 1) =>
    set((s) => {
      const items = s.inventory.items
        .map((i) => (i.itemId === itemId ? { ...i, count: i.count - count } : i))
        .filter((i) => i.count > 0);
      return { inventory: { ...s.inventory, items } };
    }),
  addGold: (amount) =>
    set((s) => ({ inventory: { ...s.inventory, gold: Math.max(0, s.inventory.gold + amount) } })),
  setMap: (mapNodes) => set({ mapNodes }),
  setCurrentNode: (currentNodeId) => set({ currentNodeId }),
  visitNode: (nodeId) =>
    set((s) => ({
      mapNodes: s.mapNodes.map((n) => (n.id === nodeId ? { ...n, visited: true } : n)),
    })),
  setWon: (won) => set({ won }),
  resetRun: () =>
    set({
      phase: 'starterSelect',
      act: 1,
      party: [],
      inventory: { ...INITIAL_INVENTORY, items: [...INITIAL_INVENTORY.items] },
      mapNodes: [],
      currentNodeId: null,
      won: null,
    }),
}));

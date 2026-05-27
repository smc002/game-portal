import { create } from 'zustand';
import { runEnemyAi } from '../engine/ai';
import { tryOccupyTile } from '../engine/actions';
import { createInitialState } from '../engine/gameInit';
import { updateGame } from '../engine/tick';
import type { GameState, Owner } from '../types/game';

type GameStore = GameState & {
  occupyTile: (owner: Owner, tileId: string) => void;
  tick: (deltaMs: number) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(),

  occupyTile: (owner, tileId) => {
    set((state) => {
      tryOccupyTile(state, owner, tileId);
      return { ...state, tiles: { ...state.tiles }, buildings: { ...state.buildings }, units: { ...state.units }, projectiles: { ...state.projectiles } };
    });
  },

  tick: (deltaMs) => {
    set((state) => {
      updateGame(state, deltaMs, runEnemyAi);
      return {
        ...state,
        tiles: { ...state.tiles },
        buildings: { ...state.buildings },
        units: { ...state.units },
        projectiles: { ...state.projectiles },
        players: { ...state.players },
        floatingTexts: [...state.floatingTexts],
        logs: [...state.logs],
      };
    });
  },

  reset: () => {
    set({ ...createInitialState() });
  },
}));

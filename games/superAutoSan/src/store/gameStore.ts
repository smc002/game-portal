import { create } from 'zustand';
import type { GamePhase, GeneralInstance } from '../data/types';
import { STARTING_LIVES, TIER_UNLOCK } from '../data/types';

interface GameState {
  phase: GamePhase;
  wave: number;
  turn: number;
  lives: number;
  team: GeneralInstance[];
  tierUnlocked: number;

  startGame: () => void;
  setPhase: (phase: GamePhase) => void;
  nextTurn: () => void;
  loseLife: () => void;
  restoreLife: () => void;
  updateTeam: (team: GeneralInstance[]) => void;
  incrementWave: () => void;
  reset: () => void;
}

function getTierForTurn(turn: number): number {
  let tier = 1;
  for (const [t, tierVal] of Object.entries(TIER_UNLOCK)) {
    if (turn >= Number(t)) tier = tierVal;
  }
  return tier;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  wave: 0,
  turn: 1,
  lives: STARTING_LIVES,
  team: [],
  tierUnlocked: 1,

  startGame: () =>
    set({
      phase: 'tutorial',
      wave: 0,
      turn: 1,
      lives: STARTING_LIVES,
      team: [],
      tierUnlocked: 1,
    }),

  setPhase: (phase) => set({ phase }),

  nextTurn: () => {
    const turn = get().turn + 1;
    const tierUnlocked = getTierForTurn(turn);
    // Restore 1 life at turn 3 if lost any
    const lives = turn === 3 && get().lives < STARTING_LIVES
      ? get().lives + 1
      : get().lives;
    set({ turn, tierUnlocked, lives });
  },

  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1) })),

  restoreLife: () => set((s) => ({ lives: Math.min(STARTING_LIVES, s.lives + 1) })),

  updateTeam: (team) => set({ team }),

  incrementWave: () => set((s) => ({ wave: s.wave + 1 })),

  reset: () =>
    set({
      phase: 'title',
      wave: 0,
      turn: 1,
      lives: STARTING_LIVES,
      team: [],
      tierUnlocked: 1,
    }),
}));

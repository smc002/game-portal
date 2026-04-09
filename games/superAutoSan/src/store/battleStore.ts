import { create } from 'zustand';
import type { BattleEvent, GeneralInstance } from '../data/types';

interface BattleState {
  events: BattleEvent[];
  currentEventIdx: number;
  playerTeam: GeneralInstance[];
  enemyTeam: GeneralInstance[];
  speed: 1 | 2 | 3;
  isPlaying: boolean;
  result: 'win' | 'lose' | 'draw' | null;

  startBattle: (events: BattleEvent[], playerTeam: GeneralInstance[], enemyTeam: GeneralInstance[]) => void;
  nextEvent: () => BattleEvent | null;
  setSpeed: (speed: 1 | 2 | 3) => void;
  setPlaying: (playing: boolean) => void;
  updateTeams: (playerTeam: GeneralInstance[], enemyTeam: GeneralInstance[]) => void;
  setResult: (result: 'win' | 'lose' | 'draw') => void;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  events: [],
  currentEventIdx: 0,
  playerTeam: [],
  enemyTeam: [],
  speed: 1,
  isPlaying: false,
  result: null,

  startBattle: (events, playerTeam, enemyTeam) =>
    set({
      events,
      currentEventIdx: 0,
      playerTeam: JSON.parse(JSON.stringify(playerTeam)),
      enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
      isPlaying: true,
      result: null,
    }),

  nextEvent: () => {
    const state = get();
    if (state.currentEventIdx >= state.events.length) return null;
    const event = state.events[state.currentEventIdx]!;
    set({ currentEventIdx: state.currentEventIdx + 1 });
    return event;
  },

  setSpeed: (speed) => set({ speed }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  updateTeams: (playerTeam, enemyTeam) => set({ playerTeam, enemyTeam }),

  setResult: (result) => set({ result, isPlaying: false }),

  reset: () =>
    set({
      events: [],
      currentEventIdx: 0,
      playerTeam: [],
      enemyTeam: [],
      isPlaying: false,
      result: null,
    }),
}));

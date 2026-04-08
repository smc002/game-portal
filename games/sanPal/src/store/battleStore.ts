import { create } from 'zustand';
import type { GeneralInstance, BattleAction } from '../data/types';

export interface BattleState {
  playerTeam: GeneralInstance[];
  enemyTeam: GeneralInstance[];
  playerActiveIdx: number;
  enemyActiveIdx: number;
  turnNumber: number;
  log: BattleAction[];
  isPlayerTurn: boolean;
  isBattleOver: boolean;
  playerWon: boolean | null;
  animating: boolean;

  initBattle: (player: GeneralInstance[], enemy: GeneralInstance[]) => void;
  setPlayerActive: (idx: number) => void;
  setEnemyActive: (idx: number) => void;
  updatePlayerGeneral: (idx: number, patch: Partial<GeneralInstance>) => void;
  updateEnemyGeneral: (idx: number, patch: Partial<GeneralInstance>) => void;
  addLog: (action: BattleAction) => void;
  setIsPlayerTurn: (v: boolean) => void;
  setAnimating: (v: boolean) => void;
  endBattle: (playerWon: boolean) => void;
  nextTurn: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  playerTeam: [],
  enemyTeam: [],
  playerActiveIdx: 0,
  enemyActiveIdx: 0,
  turnNumber: 1,
  log: [],
  isPlayerTurn: true,
  isBattleOver: false,
  playerWon: null,
  animating: false,

  initBattle: (player, enemy) =>
    set({
      playerTeam: player,
      enemyTeam: enemy,
      playerActiveIdx: 0,
      enemyActiveIdx: 0,
      turnNumber: 1,
      log: [],
      isPlayerTurn: true,
      isBattleOver: false,
      playerWon: null,
      animating: false,
    }),

  setPlayerActive: (idx) => set({ playerActiveIdx: idx }),
  setEnemyActive: (idx) => set({ enemyActiveIdx: idx }),

  updatePlayerGeneral: (idx, patch) =>
    set((s) => {
      const team = [...s.playerTeam];
      team[idx] = { ...team[idx]!, ...patch };
      return { playerTeam: team };
    }),

  updateEnemyGeneral: (idx, patch) =>
    set((s) => {
      const team = [...s.enemyTeam];
      team[idx] = { ...team[idx]!, ...patch };
      return { enemyTeam: team };
    }),

  addLog: (action) => set((s) => ({ log: [...s.log, action] })),
  setIsPlayerTurn: (isPlayerTurn) => set({ isPlayerTurn }),
  setAnimating: (animating) => set({ animating }),
  endBattle: (playerWon) => set({ isBattleOver: true, playerWon }),
  nextTurn: () => set((s) => ({ turnNumber: s.turnNumber + 1 })),
}));

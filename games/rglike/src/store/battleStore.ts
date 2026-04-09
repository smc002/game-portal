import { create } from 'zustand';
import { BattleUnit, BattleAction, BattleStatus, BattleSpeed } from '../types';

interface BattleStore {
  allies: BattleUnit[];
  enemies: BattleUnit[];
  actionLog: BattleAction[];
  tick: number;
  status: BattleStatus;
  speed: BattleSpeed;

  initBattle: (allies: BattleUnit[], enemies: BattleUnit[]) => void;
  applyTick: (allies: BattleUnit[], enemies: BattleUnit[], actions: BattleAction[], status: BattleStatus) => void;
  addActions: (actions: BattleAction[]) => void;
  setStatus: (status: BattleStatus) => void;
  setSpeed: (speed: BattleSpeed) => void;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleStore>((set) => ({
  allies: [],
  enemies: [],
  actionLog: [],
  tick: 0,
  status: 'preparing',
  speed: 1,

  initBattle: (allies, enemies) =>
    set({
      allies: JSON.parse(JSON.stringify(allies)),
      enemies: JSON.parse(JSON.stringify(enemies)),
      actionLog: [],
      tick: 0,
      status: 'preparing',
    }),

  applyTick: (allies, enemies, actions, status) =>
    set((state) => {
      const newLog = [...state.actionLog, ...actions];
      return {
        allies: JSON.parse(JSON.stringify(allies)),
        enemies: JSON.parse(JSON.stringify(enemies)),
        actionLog: newLog.length > 100 ? newLog.slice(-100) : newLog,
        tick: state.tick + 1,
        status,
      };
    }),

  addActions: (actions) =>
    set((state) => ({
      actionLog: [...state.actionLog, ...actions],
    })),

  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),

  resetBattle: () =>
    set({
      allies: [],
      enemies: [],
      actionLog: [],
      tick: 0,
      status: 'preparing',
      speed: 1,
    }),
}));

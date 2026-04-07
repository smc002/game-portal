import { create } from 'zustand';
import type { PlayerState } from '../../../shared/types/player.js';
import type { GameMapState } from '../../../shared/types/map.js';
import type { HeroInstance } from '../../../shared/types/hero.js';
import type { BattleEvent, BattleResultPayload } from '../../../shared/types/battle.js';

export type GamePhase = 'login' | 'lobby' | 'in_game';

interface RerollData {
  heroes: HeroInstance[];
  freeRerolls: number[];
}

interface GameStore {
  // 连接状态
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;

  // 玩家状态
  player: PlayerState | null;
  setPlayer: (player: PlayerState) => void;
  patchPlayer: (patch: Partial<PlayerState>) => void;

  // 地图状态
  mapState: GameMapState | null;
  setMapState: (map: GameMapState) => void;
  patchMapState: (patch: Partial<GameMapState>) => void;

  // Reroll 弹窗状态
  rerollData: RerollData | null;
  setRerollData: (data: RerollData | null) => void;

  // 编队面板
  showSquadPanel: boolean;
  setShowSquadPanel: (show: boolean) => void;

  // 战斗状态
  battleEvents: BattleEvent[] | null;
  battleResult: BattleResultPayload | null;
  setBattleData: (events: BattleEvent[], result: BattleResultPayload) => void;
  clearBattle: () => void;

  // 遭遇预警
  encounterData: {
    enemyId: string; enemyName: string; estimatedPower: number; type: 'normal' | 'ambush';
  } | null;
  setEncounterData: (data: GameStore['encounterData']) => void;

  // 掠夺选项
  lootData: {
    heroOption: HeroInstance | null; resourceAmount: number;
  } | null;
  setLootData: (data: GameStore['lootData']) => void;

  // 通知消息
  notifications: { id: number; type: string; message: string }[];
  addNotification: (type: string, message: string) => void;
  clearNotification: (id: number) => void;

  // 搜索进度
  searchProgress: { duration: number; rarity: 'gray' | 'green' | 'blue' | 'orange'; startTime: number } | null;
  setSearchProgress: (data: { duration: number; rarity: 'gray' | 'green' | 'blue' | 'orange' } | null) => void;

  // 屏幕中央飘字
  centerFloats: { id: number; text: string; color?: string }[];
  addCenterFloat: (text: string, color?: string) => void;
  removeCenterFloat: (id: number) => void;
}

let notifId = 0;

export const useGameStore = create<GameStore>((set) => ({
  phase: 'login',
  setPhase: (phase) => set({ phase }),

  player: null,
  setPlayer: (player) => set({ player }),
  patchPlayer: (patch) =>
    set((state) => ({
      player: state.player ? { ...state.player, ...patch } : null,
    })),

  mapState: null,
  setMapState: (mapState) => set({ mapState }),
  patchMapState: (patch) =>
    set((state) => ({
      mapState: state.mapState ? { ...state.mapState, ...patch } : null,
    })),

  rerollData: null,
  setRerollData: (rerollData) => set({ rerollData }),

  showSquadPanel: false,
  setShowSquadPanel: (showSquadPanel) => set({ showSquadPanel }),

  battleEvents: null,
  battleResult: null,
  setBattleData: (battleEvents, battleResult) => set({ battleEvents, battleResult }),
  clearBattle: () => set({ battleEvents: null, battleResult: null }),

  encounterData: null,
  setEncounterData: (encounterData) => set({ encounterData }),

  lootData: null,
  setLootData: (lootData) => set({ lootData }),

  notifications: [],
  addNotification: (type, message) =>
    set((state) => ({
      notifications: [...state.notifications, { id: ++notifId, type, message }],
    })),
  clearNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  searchProgress: null,
  setSearchProgress: (data) =>
    set({ searchProgress: data ? { ...data, startTime: Date.now() } : null }),

  centerFloats: [],
  addCenterFloat: (text, color) =>
    set((state) => ({
      centerFloats: [...state.centerFloats, { id: ++notifId, text, color }],
    })),
  removeCenterFloat: (id) =>
    set((state) => ({
      centerFloats: state.centerFloats.filter((f) => f.id !== id),
    })),
}));

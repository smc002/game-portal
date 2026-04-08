import { AbilityType, Quality, Rating } from './enums';
import { GearInstance } from './gear';

/** 今日能力条目（运行时） */
export interface AbilityEntry {
  type: AbilityType;
  name: string;
  description: string;
  uses?: number;
  used?: boolean;
}

/** 槽位快照（运转记录用） */
export interface SlotSnapshot {
  defId: string;
  quality: Quality;
  effectiveQuality: Quality;
  slotIndex: number;
}

/** 单个机关的运转效果 */
export interface OperationEffect {
  gearDefId: string;
  gearName: string;
  quality: Quality;
  effectiveQuality: Quality;
  normalEffectText: string;
  specialTriggered: boolean;
  specialEffectText: string;
  floatingTexts: string[];
  score: number;
  treasurePoints: number;
}

/** 运转记录 */
export interface OperationRecord {
  day: number;
  slotSnapshots: SlotSnapshot[];
  effects: OperationEffect[];
  totalScore: number;
  rating: Rating;
  treasurePointsGained: number;
}

/** 游戏状态 */
export interface GameState {
  day: number;
  maxSlots: number;
  slots: (GearInstance | null)[];
  backpack: GearInstance[];
  hasOperatedToday: boolean;
  extraOperations: number;
  treasurePoints: number;
  treasureThreshold: number;
  treasureCount: number;
  history: OperationRecord[];
  todayAbilities: AbilityEntry[];
  collectedGearIds: string[];
  pendingAcquires: number;
  pendingTreasure: boolean;
  totalAcquires: number;
}

/** Reducer Actions */
export type GameAction =
  | { type: 'NEXT_DAY' }
  | { type: 'ACQUIRE_GEAR'; defId: string }
  | { type: 'PLACE_GEAR'; instanceId: string; slotIndex: number }
  | { type: 'REMOVE_GEAR'; slotIndex: number }
  | { type: 'OPERATE'; result: OperationRecord; abilities: AbilityEntry[]; treasureGained: boolean; grantExtraOp: boolean }
  | { type: 'ACQUIRE_TREASURE'; defId: string }
  | { type: 'CONSUME_PENDING_ACQUIRE' }
  | { type: 'SET_PENDING_TREASURE'; value: boolean }
  | { type: 'REFORGE_SACRIFICE'; instanceIds: string[] }
  | { type: 'REFORGE_SELECT'; defId: string }
  | { type: 'BATCH_ACQUIRE_GEARS'; defIds: string[] }
  | { type: 'DESTROY_SLOT_TREASURES' }
  | { type: 'USE_EXTRA_OPERATION' };

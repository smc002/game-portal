// ========== Game Phase ==========
export type GamePhase = 'title' | 'shop' | 'battle' | 'gameOver';

// ========== Trigger Types ==========
export type TriggerType =
  // Battle triggers
  | 'startOfBattle'
  | 'beforeAttack'
  | 'afterAttack'
  | 'hurt'
  | 'faint'
  | 'knockOut'
  | 'friendAheadFaints'
  | 'friendAheadAttacks'
  | 'friendSummoned'
  | 'enemySummoned'
  // Shop triggers
  | 'buy'
  | 'sell'
  | 'levelUp'
  | 'startOfTurn'
  | 'endOfTurn'
  | 'friendSold'
  | 'friendEatsFood'
  | 'eatsFood'
  | 'summoned'
  | 'none'; // passive (e.g. Cat)

// ========== General (武将) ==========
export interface GeneralDef {
  id: string;
  name: string;
  originalName: string; // SAP original name
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  baseAtk: number;
  baseHp: number;
  trigger: TriggerType;
  abilityDesc: string;
}

export interface GeneralInstance {
  defId: string;
  instanceId: string;
  atk: number;
  hp: number;
  maxHp: number;
  level: 1 | 2 | 3;
  xp: number;
  perk: string | null;
  tempAtk: number;
  tempHp: number;
}

// ========== Item (道具) ==========
export type ItemType = 'stat' | 'perk' | 'special';

export interface ItemDef {
  id: string;
  name: string;
  originalName: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  cost: number;
  type: ItemType;
  description: string;
}

// ========== Wave Config (敌方波次) ==========
export interface WaveConfig {
  waveRange: [number, number];
  petCount: [number, number];
  tierRange: [number, number];
  maxLevel: 1 | 2 | 3;
  levelChance: { lv2: number; lv3: number };
  perkChance: number;
  availablePerks: string[];
}

// ========== Battle Events ==========
export type Side = 'player' | 'enemy';

export type BattleEvent =
  | { type: 'battle_start' }
  | { type: 'battle_end'; result: 'win' | 'lose' | 'draw' }
  | { type: 'attack'; attackerSide: Side; attackerIdx: number; defenderSide: Side; defenderIdx: number; damage: number }
  | { type: 'hurt'; side: Side; idx: number; hpBefore: number; hpAfter: number }
  | { type: 'faint'; side: Side; idx: number; generalId: string }
  | { type: 'summon'; side: Side; idx: number; general: GeneralInstance }
  | { type: 'buff'; side: Side; idx: number; atk: number; hp: number; temporary: boolean }
  | { type: 'perk_trigger'; side: Side; idx: number; perkId: string; effect: string }
  | { type: 'ability_trigger'; side: Side; idx: number; abilityDesc: string }
  | { type: 'knockback'; side: Side; idx: number }
  | { type: 'shift_forward'; side: Side }
  | { type: 'damage_dealt'; side: Side; idx: number; amount: number; targetSide: Side; targetIdx: number }
  | { type: 'snapshot'; playerTeam: GeneralInstance[]; enemyTeam: GeneralInstance[] };

// ========== Shop Events ==========
export type ShopEvent =
  | { type: 'sell_trigger'; generalId: string; effect: string }
  | { type: 'buy_trigger'; generalId: string; effect: string }
  | { type: 'level_up'; generalId: string; newLevel: 2 | 3 }
  | { type: 'start_of_turn_trigger'; generalId: string; effect: string }
  | { type: 'end_of_turn_trigger'; generalId: string; effect: string };

// ========== Tier Config ==========
export const TIER_UNLOCK: Record<number, number> = {
  1: 1,
  3: 2,
  5: 3,
  7: 4,
  9: 5,
  11: 6,
};

export const SHOP_SLOTS: Record<number, { pets: number; items: number }> = {
  1: { pets: 3, items: 1 },
  2: { pets: 3, items: 1 },
  3: { pets: 4, items: 1 },
  4: { pets: 4, items: 2 },
  5: { pets: 5, items: 2 },
  6: { pets: 5, items: 2 },
};

// ========== Tier Colors ==========
export const TIER_COLORS: Record<number, string> = {
  1: '#888888', // grey
  2: '#4caf50', // green
  3: '#2196f3', // blue
  4: '#9c27b0', // purple
  5: '#ff9800', // orange
  6: '#ffd700', // gold
};

// ========== Constants ==========
export const MAX_TEAM_SIZE = 5;
export const STARTING_LIVES = 5;
export const GOLD_PER_TURN = 10;
export const PET_COST = 3;
export const ROLL_COST = 1;
export const MAX_STAT = 50;
export const XP_TO_LV2 = 2; // need 2 extra copies to reach Lv2
export const XP_TO_LV3 = 5; // need 3 more copies at Lv2 (5 total merges)

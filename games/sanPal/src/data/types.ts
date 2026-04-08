// ===== Weapon Type (replaces Element) =====
export type WeaponType = 'bow' | 'spear' | 'cavalry';

// Advantage cycle: bow > spear > cavalry > bow
export const WEAPON_ADVANTAGE: Record<WeaponType, WeaponType> = {
  bow: 'spear',
  spear: 'cavalry',
  cavalry: 'bow',
};

export function getWeaponMultiplier(attacker: WeaponType, defender: WeaponType): number {
  if (WEAPON_ADVANTAGE[attacker] === defender) return 1.5;
  if (WEAPON_ADVANTAGE[defender] === attacker) return 0.67;
  return 1.0;
}

export const WEAPON_LABEL: Record<WeaponType, string> = {
  bow: '弓', spear: '枪', cavalry: '骑',
};

export const WEAPON_EMOJI: Record<WeaponType, string> = {
  bow: '🏹', spear: '🔱', cavalry: '🐴',
};

export function getAdvantageText(attacker: WeaponType, defender: WeaponType): string {
  if (WEAPON_ADVANTAGE[attacker] === defender) return '克制!';
  if (WEAPON_ADVANTAGE[defender] === attacker) return '被克!';
  return '';
}

// ===== Faction =====
export type Faction = 'wei' | 'shu' | 'wu' | 'qun';

export const FACTION_LABEL: Record<Faction, string> = {
  wei: '魏', shu: '蜀', wu: '吴', qun: '群',
};

// ===== Star Level =====
export type StarLevel = 1 | 2 | 3 | 4 | 5;

// ===== Stats =====
export interface Stats {
  hp: number;
  atk: number;
  int: number;
  def: number;
  res: number;
  spd: number;
}

export type StatKey = keyof Stats;

export const STAT_LABEL: Record<StatKey, string> = {
  hp: '生命', atk: '武力', int: '智力', def: '防御', res: '谋略', spd: '速度',
};

// ===== Skills =====
export type SkillType = 'martial' | 'strategy' | 'support';

export interface SkillEffect {
  type: 'status' | 'statChange' | 'heal' | 'shield' | 'special';
  target: 'self' | 'enemy';
  chance: number; // 0-100
  value: unknown;
}

export interface SkillDef {
  id: string;
  name: string;
  type: SkillType;
  power: number;        // 0 for support skills
  accuracy: number;     // 0-100
  energyCost: number;   // 0-5 energy cost
  priority: number;     // +2/+1/0/-1
  description: string;
  effects: SkillEffect[];
}

// ===== Passive =====
export interface PassiveDef {
  id: string;
  name: string;
  description: string;
}

// ===== General Definition (static data) =====
export interface GeneralDef {
  id: string;
  name: string;
  weapon: WeaponType;
  faction: Faction;
  star: StarLevel;
  baseStats: Stats;
  passive: PassiveDef;
  skills: SkillDef[];   // exactly 4: [attack1, attack2, defense, charge]
}

// ===== General Instance (runtime in a run) =====
export interface GeneralInstance {
  defId: string;
  level: number;
  exp: number;
  currentHP: number;
  maxHP: number;
  energy: number;       // 0-10, starts at 10
  statStages: Record<StatKey, number>; // -3 to +3
  status: StatusCondition | null;
  specialStates: SpecialState[];
  justSwitchedIn?: boolean;
}

// ===== Status Conditions =====
export type StatusType = 'burn' | 'freeze' | 'poison' | 'confusion' | 'stun';

export interface StatusCondition {
  type: StatusType;
  turnsLeft: number; // -1 = until cleared
}

export const STATUS_LABEL: Record<StatusType, string> = {
  burn: '灼烧', freeze: '冰冻', poison: '中毒', confusion: '混乱', stun: '眩晕',
};

export const STATUS_EMOJI: Record<StatusType, string> = {
  burn: '🔥', freeze: '🧊', poison: '☠️', confusion: '😵', stun: '⚡',
};

// ===== Special States =====
export type SpecialStateType = 'shield' | 'counter' | 'locked' | 'doom' | 'stance';

export interface SpecialState {
  type: SpecialStateType;
  turnsLeft: number;
  value: number; // shield HP, counter %, stance buff type, etc.
}

// ===== Synergy =====
export interface SynergyDef {
  id: string;
  name: string;
  type: 'passive' | 'trigger';
  requiredGenerals: string[];
  minCount?: number;
  description: string;
}

// ===== Items =====
export type ItemCategory = 'capture' | 'heal' | 'battle';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  price: number;
  effect: unknown;
}

// ===== Map =====
export type NodeType = 'wild' | 'elite' | 'shop' | 'rest' | 'event' | 'boss' | 'spawn';

export interface MapNode {
  id: string;
  type: NodeType;
  layer: number;
  connections: string[];
  visited: boolean;
  data: NodeData;
}

export type NodeData =
  | { type: 'wild'; generalId: string; level?: number }
  | { type: 'elite'; generalIds: string[] }
  | { type: 'shop'; items: { itemId: string; price: number }[] }
  | { type: 'rest' }
  | { type: 'event'; eventId: string }
  | { type: 'boss'; generalId: string; escorts: string[] }
  | { type: 'spawn' };

export const NODE_EMOJI: Record<NodeType, string> = {
  spawn: '🏠', wild: '⚔️', elite: '💀', shop: '🏪', rest: '🏕️', event: '📜', boss: '👹',
};

export const NODE_LABEL: Record<NodeType, string> = {
  spawn: '出生点', wild: '野将', elite: '精英', shop: '商铺', rest: '休憩', event: '奇遇', boss: 'Boss',
};

// ===== Game Phase =====
export type GamePhase =
  | 'title'
  | 'starterSelect'
  | 'map'
  | 'battle'
  | 'capture'
  | 'shop'
  | 'rest'
  | 'event'
  | 'team'
  | 'result';

// ===== Battle Action (for battle log) =====
export interface BattleAction {
  type: 'skill' | 'switch' | 'item' | 'status' | 'synergy' | 'faint' | 'info';
  actorSide?: 'player' | 'enemy';
  message: string;
  damage?: number;
  heal?: number;
}

// ===== Energy Constants =====
export const MAX_ENERGY = 10;
export const CHARGE_ENERGY = 5;

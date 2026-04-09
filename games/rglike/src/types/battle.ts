import { HeroId, HeroRole } from './hero';
import { EnemyType } from './enemy';

export type StatusEffectType =
  | 'taunt'
  | 'burn'
  | 'atkBuff'
  | 'spdBuff'
  | 'spdDebuff'
  | 'shield'
  | 'hot' // heal over time
  | 'charm'
  | 'defDown';

export interface StatusEffect {
  type: StatusEffectType;
  value: number;
  remainingActions: number;
  sourceUnitId: string;
  stacks?: number;
}

export type BattleUnitSide = 'ally' | 'enemy';

export interface BattleUnit {
  id: string;
  name: string;
  side: BattleUnitSide;
  role: HeroRole | EnemyType;
  heroId?: HeroId;
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  actionBar: number; // 0-1000
  statusEffects: StatusEffect[];
  isAlive: boolean;
  level?: number;
  // per-battle state for passives
  passiveState: Record<string, number>;
  // boss phase tracking
  isBoss?: boolean;
  bossPhase?: number;
  bossPhaseThreshold?: number;
}

export interface BattleActionTarget {
  unitId: string;
  damage?: number;
  healing?: number;
  statusApplied?: StatusEffectType;
  killed?: boolean;
  shieldDamage?: number;
}

export interface BattleAction {
  actorId: string;
  actorName: string;
  type: 'skill' | 'basicAttack' | 'passive' | 'itemEffect' | 'dot' | 'phaseChange';
  skillName?: string;
  targets: BattleActionTarget[];
  description: string;
}

export type BattleStatus = 'preparing' | 'running' | 'paused' | 'won' | 'lost';

export type BattleSpeed = 1 | 2 | 4;

export interface BattleState {
  allies: BattleUnit[];
  enemies: BattleUnit[];
  actionLog: BattleAction[];
  tick: number;
  status: BattleStatus;
  speed: BattleSpeed;
}

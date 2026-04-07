import type { HeroInstance, StatusEffect } from './hero.js';
import type { Tome } from './player.js';

/** 参战方实体 */
export interface CombatantEntity {
  playerId: string;
  maxHp: number;
  currentHp: number;
  shield: number;
  tomes: Tome[];
  buffs: StatusEffect[];
  formation: (HeroInstance | null)[];   // 长度5，有序
}

/** 战斗输入 */
export interface BattleInput {
  playerA: CombatantEntity;
  playerB: CombatantEntity;
}

/** 战斗输出 */
export interface BattleOutput {
  winner: 'A' | 'B';
  playerA: { remainingHp: number; shield: number };
  playerB: { remainingHp: number; shield: number };
  events: BattleEvent[];
  totalTicks: number;
}

/** 战斗结果（含阵容快照，发送给客户端） */
export interface BattleResultPayload extends BattleOutput {
  formationA: (HeroInstance | null)[];
  formationB: (HeroInstance | null)[];
  maxHpA: number;
  maxHpB: number;
  nameA: string;
  nameB: string;
}

/** 战斗事件类型 */
export type BattleEvent =
  | { type: 'battle_start'; tick: number }
  | { type: 'action_start'; heroId: string; side: 'A' | 'B'; position: number; tick: number }
  | { type: 'damage'; target: 'A' | 'B'; amount: number; isTrueDamage: boolean; sourceHeroId: string; tick: number }
  | { type: 'heal'; target: 'A' | 'B'; amount: number; sourceHeroId: string; tick: number }
  | { type: 'shield_change'; target: 'A' | 'B'; amount: number; sourceHeroId: string; tick: number }
  | { type: 'buff_applied'; target: string; targetType: 'hero' | 'player'; buffName: string; stacks: number; tick: number }
  | { type: 'buff_removed'; target: string; targetType: 'hero' | 'player'; buffName: string; tick: number }
  | { type: 'atb_modified'; heroId: string; side: 'A' | 'B'; position: number; amount: number; tick: number }
  | { type: 'hero_defeated'; heroId: string; side: 'A' | 'B'; position: number; tick: number }
  | { type: 'battle_end'; winner: 'A' | 'B'; tick: number };

/** 伤害类型 */
export enum DamageType {
  Normal = 'normal',      // 先扣Shield再扣HP
  True = 'true',          // 无视Shield直扣HP
}

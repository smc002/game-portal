import { UnitStats, SkillDefinition } from './hero';

export type EnemyType = 'melee' | 'archer' | 'mage' | 'elite' | 'boss';

export interface EnemyDefinition {
  id: string;
  name: string;
  type: EnemyType;
  baseStats: UnitStats;
  skill: SkillDefinition;
  isBoss?: boolean;
  bossPhaseThreshold?: number; // HP percentage to enter phase 2
  bossPhase2Skill?: SkillDefinition;
  bossSpecial?: string; // description of boss special mechanic
}

export interface EnemyInstance {
  definitionId: string;
  scaledStats: UnitStats;
}

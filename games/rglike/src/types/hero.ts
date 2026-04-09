export type HeroId =
  | 'zhaoYun'
  | 'guanYu'
  | 'zhangFei'
  | 'zhuGeLiang'
  | 'zhouYu'
  | 'huaTuo'
  | 'diaoChan'
  | 'siMaYi'
  | 'liuBei'
  | 'sunShangXiang';

export type HeroRole = 'singleDPS' | 'aoeDPS' | 'healer' | 'buffer' | 'tank' | 'controller';

export interface UnitStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface SkillDefinition {
  name: string;
  description: string;
  multiplier: number;
  isAoE: boolean;
}

export interface PassiveDefinition {
  name: string;
  description: string;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  role: HeroRole;
  baseStats: UnitStats;
  growth: UnitStats;
  passive: PassiveDefinition;
  skill: SkillDefinition;
  boundItemId?: string;
}

export interface HeroInstance {
  definitionId: HeroId;
  level: number;
}

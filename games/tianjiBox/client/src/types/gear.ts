import { GearCategory, Quality, SpecialConditionType, AbilityType } from './enums';

/** 今日能力条目定义 */
export interface AbilityEntryDef {
  type: AbilityType;
  name: string;
  description: string;
}

/** 特殊激活条件 */
export interface SpecialCondition {
  type: SpecialConditionType;
  param?: GearCategory;
}

/** 机关效果定义 */
export interface GearEffectDef {
  /** 效果描述模板，用 {value} 插值 */
  descriptionTemplate: string;
  /** 各品质对应数值 [白, 蓝, 紫, 橙, 红] */
  values: number[];
  /** 飘字模板 */
  floatingTextTemplate: string;
  /** 今日能力条目（可选） */
  abilityEntry?: AbilityEntryDef;
}

/** 机关静态定义（配置数据） */
export interface GearDef {
  id: string;
  name: string;
  category: GearCategory;
  /** 珍宝为 Quality.White(1)，其它为 Quality.Red(5) */
  maxQuality: Quality;
  /** 各品质基础分数 */
  baseScore: number[];
  /** 触发特殊条件的额外分数 */
  specialScore: number;
  /** 普通效果 */
  effect: GearEffectDef;
  /** 特殊激活条件 */
  specialCondition: SpecialCondition;
  /** 特殊效果 */
  specialEffect: GearEffectDef;
  /** [普通简略, 特殊简略] */
  briefDesc: [string, string];
  /** 基础珍宝点数 */
  baseTreasurePoints: number;
  /** 结算优先级，越小越先（默认 10） */
  settlementPriority: number;
}

/** 玩家持有的机关实例 */
export interface GearInstance {
  instanceId: string;
  defId: string;
  quality: Quality;
}

/** 创建机关实例 */
export function createGearInstance(defId: string, quality: Quality = Quality.White): GearInstance {
  return {
    instanceId: crypto.randomUUID(),
    defId,
    quality,
  };
}

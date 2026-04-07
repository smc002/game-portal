/** 阵营（国别） */
export enum Faction {
  Wei = 'wei',
  Shu = 'shu',
  Wu = 'wu',
  Qun = 'qun',
}

/** 职业 */
export enum HeroClass {
  MengJiang = 'mengjiang',  // 猛将
  MouShi = 'moushi',        // 谋士
  HouQin = 'houqin',        // 后勤
}

/** 武将静态数据（图鉴） */
export interface HeroTemplate {
  id: string;
  name: string;
  faction: Faction;
  heroClass: HeroClass;
  baseAttack: number;
  baseSpeed: number;
  baseSpecialPower: number;
  skillDescription: string;   // 20-40字技能描述
  skillId: string;            // 关联技能函数标识
}

/** 局内武将实例 */
export interface HeroInstance {
  instanceId: string;         // 运行时唯一ID
  templateId: string;         // 引用 HeroTemplate.id
  name: string;
  faction: Faction;
  heroClass: HeroClass;
  starLevel: number;          // 1-5星
  attack: number;             // 含星级加成
  speed: number;
  specialPower: number;
  skillId: string;

  // 战斗运行时（仅战斗中使用）
  atb: number;                // 0-100
  buffs: StatusEffect[];
}

/** 状态效果 */
export interface StatusEffect {
  id: string;
  name: string;
  stacks: number;
  duration: number;           // 剩余持续时间（秒），-1为永久
  data?: Record<string, number>;  // 附加数据（如 BonusDamage 的数值）
}

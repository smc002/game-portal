import { GearInstance } from '../types/gear';
import { GearCategory } from '../types/enums';
import { GEAR_DEF_MAP } from '../data/gears';

/** 计算机关实例的等级（白1 蓝2 紫3 橙4 红5） */
export function getGearLevel(gear: GearInstance): number {
  return gear.quality; // Quality enum 值就是等级
}

/** 计算投入机关的总等级 */
export function getTotalLevel(gears: GearInstance[]): number {
  return gears.reduce((sum, g) => sum + getGearLevel(g), 0);
}

/** 计算可自选次数 */
export function getSelectCount(totalLevel: number): number {
  return Math.floor(totalLevel / 2);
}

/** 是否有余数（奇数等级） */
export function hasRemainder(totalLevel: number): boolean {
  return totalLevel % 2 !== 0;
}

/** 检查机关是否可以投入重铸（非珍宝） */
export function canSacrifice(gear: GearInstance): boolean {
  const def = GEAR_DEF_MAP.get(gear.defId);
  return def ? def.category !== GearCategory.ZhenBao : false;
}

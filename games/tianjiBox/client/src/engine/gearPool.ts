import { Quality, GearCategory } from '../types/enums';
import { GearInstance } from '../types/gear';
import { NORMAL_GEAR_DEFS, TREASURE_GEAR_DEFS, FIXED_FIRST_ACQUIRES, GEAR_DEF_MAP } from '../data/gears';

/** 从数组中随机选取 n 个不重复元素 */
function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** 检查机关是否已满级 */
function isMaxLevel(defId: string, backpack: GearInstance[], slots: (GearInstance | null)[]): boolean {
  const def = GEAR_DEF_MAP.get(defId);
  if (!def) return false;
  const allGears = [...backpack, ...slots.filter(Boolean) as GearInstance[]];
  const existing = allGears.find(g => g.defId === defId);
  return existing ? existing.quality >= def.maxQuality : false;
}

/** 获取可随机到的普通机关池（排除已满级） */
function getAvailablePool(backpack: GearInstance[], slots: (GearInstance | null)[]): string[] {
  return NORMAL_GEAR_DEFS
    .filter(def => !isMaxLevel(def.id, backpack, slots))
    .map(def => def.id);
}

/** 生成三选一机关（返回 defId 数组） */
export function generateThreeChoices(
  backpack: GearInstance[],
  slots: (GearInstance | null)[],
  totalAcquires: number,
  excludeIds: string[] = [],
): string[] {
  // 前两次固定
  if (totalAcquires < FIXED_FIRST_ACQUIRES.length) {
    const fixed = FIXED_FIRST_ACQUIRES[totalAcquires];
    // 过滤掉已满级的
    const available = fixed.filter(id => !isMaxLevel(id, backpack, slots));
    if (available.length > 0) return available;
  }

  const pool = getAvailablePool(backpack, slots).filter(id => !excludeIds.includes(id));

  if (pool.length === 0) return [];
  if (pool.length <= 3) return pool;

  return sample(pool, 3);
}

/** 重随单个机关（排除当前展示的和之前的） */
export function rerollOne(
  backpack: GearInstance[],
  slots: (GearInstance | null)[],
  excludeIds: string[],
): string | null {
  const pool = getAvailablePool(backpack, slots).filter(id => !excludeIds.includes(id));
  if (pool.length === 0) {
    // 放宽限制，只排除自身
    const relaxedPool = getAvailablePool(backpack, slots);
    if (relaxedPool.length === 0) return null;
    return relaxedPool[Math.floor(Math.random() * relaxedPool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 生成珍宝二选一 */
export function generateTreasureChoices(excludeIds: string[] = []): string[] {
  const pool = TREASURE_GEAR_DEFS.map(d => d.id).filter(id => !excludeIds.includes(id));
  if (pool.length <= 2) return pool;
  return sample(pool, 2);
}

/** 为百宝箱生成 3 个随机机关 */
export function generateBatchGears(
  backpack: GearInstance[],
  slots: (GearInstance | null)[],
): string[] {
  const pool = getAvailablePool(backpack, slots);
  if (pool.length === 0) return [];
  const count = Math.min(3, pool.length);
  return sample(pool, count);
}

/** 获取可自选的机关池（重铸用，排除珍宝和已满级） */
export function getSelectablePool(
  backpack: GearInstance[],
  slots: (GearInstance | null)[],
): string[] {
  return getAvailablePool(backpack, slots);
}

/** 检查是否所有普通机关都已满级 */
export function allGearsMaxed(backpack: GearInstance[], slots: (GearInstance | null)[]): boolean {
  return getAvailablePool(backpack, slots).length === 0;
}

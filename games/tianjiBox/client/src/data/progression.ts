/** 槽位成长配置：天数 -> 已解锁槽位数 */
const SLOT_PROGRESSION: [number, number][] = [
  [1, 1],
  [2, 2],
  [4, 3],
  [6, 4],
  [8, 5],
  [10, 6],
];

/** 根据当前天数计算已解锁槽位数 */
export function getMaxSlots(day: number): number {
  let slots = 1;
  for (const [d, s] of SLOT_PROGRESSION) {
    if (day >= d) slots = s;
  }
  return slots;
}

/** 获取下一个槽位解锁的天数，若已全部解锁返回 null */
export function getNextSlotUnlockDay(day: number): number | null {
  for (const [d] of SLOT_PROGRESSION) {
    if (d > day) return d;
  }
  return null;
}

/** 获取指定槽位序号的解锁天数（0-based index） */
export function getSlotUnlockDay(slotIndex: number): number {
  if (slotIndex < SLOT_PROGRESSION.length) {
    return SLOT_PROGRESSION[slotIndex][0];
  }
  return Infinity;
}

/** 最大槽位数 */
export const MAX_SLOT_COUNT = 6;

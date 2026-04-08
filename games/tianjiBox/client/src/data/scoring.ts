import { Rating } from '../types/enums';

/**
 * 评分阈值配置
 * key: 已开放槽位数
 * value: [运筹帷幄, 巧夺天工, 天命显化] 的分数阈值
 * 低于第一个阈值为 "平平无奇"
 */
const RATING_THRESHOLDS: Record<number, [number, number, number]> = {
  1: [20, 40, 60],
  2: [40, 80, 120],
  3: [60, 120, 200],
  4: [80, 180, 300],
  5: [100, 250, 420],
  6: [120, 320, 550],
};

/** 根据总分和槽位数计算评级 */
export function calculateRating(totalScore: number, openSlots: number): Rating {
  const thresholds = RATING_THRESHOLDS[openSlots] ?? RATING_THRESHOLDS[6];
  if (totalScore >= thresholds[2]) return Rating.Divine;
  if (totalScore >= thresholds[1]) return Rating.Masterful;
  if (totalScore >= thresholds[0]) return Rating.Strategic;
  return Rating.Normal;
}

/** 珍宝点数配置 */
export const BASE_TREASURE_POINTS_PER_RUN = 10;
export const BASE_TREASURE_THRESHOLD = 30;
export const TREASURE_THRESHOLD_INCREMENT = 10;
export const MAX_HISTORY_RECORDS = 50;
export const MAX_PENDING_ACQUIRES = 3;

/** 根据已获得珍宝次数计算当前上限 */
export function getTreasureThreshold(treasureCount: number): number {
  return BASE_TREASURE_THRESHOLD + treasureCount * TREASURE_THRESHOLD_INCREMENT;
}

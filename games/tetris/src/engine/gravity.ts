// 等级 → 自动下落间隔（毫秒）
const TABLE: Record<number, number> = {
  1: 1000,
  2: 850,
  3: 700,
  4: 600,
  5: 500,
  6: 400,
  7: 300,
  8: 220,
  9: 150,
  10: 120,
};

export function getDropInterval(level: number): number {
  if (level <= 1) return 1000;
  if (level in TABLE) return TABLE[level];
  if (level <= 13) return 100;
  if (level <= 16) return 80;
  if (level <= 19) return 60;
  return 50;
}

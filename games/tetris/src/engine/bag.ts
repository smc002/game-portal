import type { TetrominoType } from '../types';

const TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function refillBag(): TetrominoType[] {
  const bag = [...TYPES];
  // Fisher-Yates 洗牌
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

// 保证 queue 至少有 minLen 个；必要时从 bag 补，bag 空了就 refill
export function ensureQueue(
  queue: TetrominoType[],
  bag: TetrominoType[],
  minLen = 5,
): { queue: TetrominoType[]; bag: TetrominoType[] } {
  const q = [...queue];
  let b = [...bag];
  while (q.length < minLen) {
    if (b.length === 0) b = refillBag();
    q.push(b.shift()!);
  }
  return { queue: q, bag: b };
}

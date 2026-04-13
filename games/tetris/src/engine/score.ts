export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export function scoreForLines(cleared: number, level: number): number {
  return (LINE_SCORES[cleared] ?? 0) * level;
}

export function scoreForSoftDrop(cells: number): number {
  return cells;
}

export function scoreForHardDrop(cells: number): number {
  return cells * 2;
}

// 每消除 10 行升一级
export function levelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

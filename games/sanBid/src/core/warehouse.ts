// 仓库生成器 — M1
// 详见 DESIGN.md §3.2（仓库结构）+ §11 待定（顶部密集排布算法）
//
// 算法概述：
//   1. 按 6 档稀有度的 countRange 抽样目标数量（自动 clamp 到全仓 30~60）
//   2. 从 ITEM_POOL 按稀有度抽取相应数量的原型
//   3. 为每件挑选形状（从 preferredShapes 随机选）
//   4. 按面积降序排序
//   5. 顶部密集排布：从行 1 起从左至右扫描，第一可放位即放置
//      若主形状放不下，尝试其备选形状；仍放不下则丢弃（产能下降视为正常容差）
//   6. 价值在 baseValue 上加 ±15% 噪声并 clamp 到该档稀有度的 valueRange

import { CONFIG } from '../config.ts';
import { ITEM_POOL, type ItemPrototype } from '../data/items.ts';
import type { Item, Rarity, Shape, Warehouse } from './types.ts';

const RARITIES: Rarity[] = ['white', 'green', 'blue', 'purple', 'gold', 'red'];

// ---------- Seedable RNG (Mulberry32) ----------
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intIn = (rng: () => number, lo: number, hi: number): number =>
  Math.floor(rng() * (hi - lo + 1)) + lo;

// ---------- 占位网格 ----------
interface PlacementGrid {
  cols: number;
  rows: number;
  cells: Uint8Array; // 0 = free, 1 = occupied
}

function newGrid(cols: number, rows: number): PlacementGrid {
  return { cols, rows, cells: new Uint8Array(cols * rows) };
}

function isFree(g: PlacementGrid, col: number, row: number, w: number, h: number): boolean {
  if (col < 1 || row < 1) return false;
  if (col + w - 1 > g.cols || row + h - 1 > g.rows) return false;
  for (let r = 0; r < h; r++) {
    const rowOff = (row - 1 + r) * g.cols;
    for (let c = 0; c < w; c++) {
      if (g.cells[rowOff + (col - 1 + c)]) return false;
    }
  }
  return true;
}

function occupy(g: PlacementGrid, col: number, row: number, w: number, h: number): void {
  for (let r = 0; r < h; r++) {
    const rowOff = (row - 1 + r) * g.cols;
    for (let c = 0; c < w; c++) {
      g.cells[rowOff + (col - 1 + c)] = 1;
    }
  }
}

/** 从行 1 开始从左至右扫描，找第一个能放下 w×h 的左上格 */
function findFirstFit(g: PlacementGrid, w: number, h: number): { col: number; row: number } | null {
  for (let r = 1; r + h - 1 <= g.rows; r++) {
    for (let c = 1; c + w - 1 <= g.cols; c++) {
      if (isFree(g, c, r, w, h)) return { col: c, row: r };
    }
  }
  return null;
}

// ---------- 价值采样 ----------
function sampleValue(rng: () => number, baseValue: number, rarity: Rarity): number {
  const [lo, hi] = CONFIG.warehouse.rarities[rarity].valueRange;
  const jitter = (rng() - 0.5) * 0.3 * baseValue; // ±15%
  const v = Math.round(baseValue + jitter);
  return Math.max(lo, Math.min(hi, v));
}

// ---------- 数量采样（每档稀有度） ----------
function sampleRarityCounts(rng: () => number): Record<Rarity, number> {
  const counts = {} as Record<Rarity, number>;
  let total = 0;
  for (const r of RARITIES) {
    const [lo, hi] = CONFIG.warehouse.rarities[r].countRange;
    counts[r] = intIn(rng, lo, hi);
    total += counts[r];
  }
  // clamp 到全仓 [30, 60]
  const [minTotal, maxTotal] = CONFIG.warehouse.itemCountRange;
  if (total < minTotal || total > maxTotal) {
    const target = intIn(rng, minTotal, maxTotal);
    const scale = target / Math.max(total, 1);
    let newTotal = 0;
    for (const r of RARITIES) {
      counts[r] = Math.max(0, Math.round(counts[r] * scale));
      newTotal += counts[r];
    }
    // 微调到精确 target
    const drift = newTotal - target;
    if (drift !== 0 && counts.white > Math.abs(drift)) {
      counts.white -= drift;
    }
  }
  return counts;
}

// ---------- 主入口 ----------
export interface GenerateOptions {
  /** 可选种子；不传则使用真正随机 */
  seed?: number;
  /** 最多重试次数（找不到合法布局时） */
  maxAttempts?: number;
}

export function generateWarehouse(opts: GenerateOptions = {}): Warehouse {
  const { seed, maxAttempts = 10 } = opts;
  const cols = CONFIG.warehouse.gridCols;
  const rows = CONFIG.warehouse.gridRows;
  const [minTotal, maxTotal] = CONFIG.warehouse.itemCountRange;
  const [minRatio, maxRatio] = CONFIG.warehouse.targetLoadRatio;

  const baseSeed = seed ?? Math.floor(Math.random() * 1e9);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = mulberry32(baseSeed + attempt);

    // 1. 抽样数量
    const targetCounts = sampleRarityCounts(rng);

    // 2. 按稀有度从 ITEM_POOL 抽样原型
    const sampled: ItemPrototype[] = [];
    for (const r of RARITIES) {
      const pool = ITEM_POOL.filter((p) => p.rarity === r);
      if (pool.length === 0) continue;
      for (let i = 0; i < targetCounts[r]; i++) {
        sampled.push(pool[Math.floor(rng() * pool.length)]);
      }
    }

    // 3. 为每件挑选形状
    type Pending = { proto: ItemPrototype; shape: Shape };
    const pending: Pending[] = sampled.map((p) => {
      const [w, h] = p.preferredShapes[Math.floor(rng() * p.preferredShapes.length)];
      return { proto: p, shape: { w, h } };
    });

    // 4. 按面积降序（大件优先放置 → 顶部更密集）
    pending.sort((a, b) => b.shape.w * b.shape.h - a.shape.w * a.shape.h);

    // 5. 顶部密集排布
    const grid = newGrid(cols, rows);
    const items: Item[] = [];
    let totalValue = 0;
    let occupiedCells = 0;
    let idCounter = 0;

    for (const p of pending) {
      let pos = findFirstFit(grid, p.shape.w, p.shape.h);
      let usedShape = p.shape;

      // 主形状放不下，尝试备选形状
      if (!pos) {
        for (const [aw, ah] of p.proto.preferredShapes) {
          if (aw === p.shape.w && ah === p.shape.h) continue;
          const tryPos = findFirstFit(grid, aw, ah);
          if (tryPos) {
            pos = tryPos;
            usedShape = { w: aw, h: ah };
            break;
          }
        }
      }

      if (!pos) continue; // 完全放不下，丢弃

      occupy(grid, pos.col, pos.row, usedShape.w, usedShape.h);
      occupiedCells += usedShape.w * usedShape.h;
      const value = sampleValue(rng, p.proto.baseValue, p.proto.rarity);
      items.push({
        id: `item-${idCounter++}`,
        name: p.proto.name,
        icon: p.proto.icon,
        cat: p.proto.cat,
        rarity: p.proto.rarity,
        value,
        shape: usedShape,
        pos,
      });
      totalValue += value;
    }

    // 6. 校验：装载率 + 数量都在合理区间
    const loadRatio = occupiedCells / (cols * rows);
    if (
      items.length >= minTotal &&
      items.length <= maxTotal &&
      loadRatio >= minRatio &&
      loadRatio <= maxRatio
    ) {
      return { cols, rows, items, totalValue };
    }
    // 否则换种子重试
  }

  throw new Error(
    `generateWarehouse: 超出最大重试次数 ${maxAttempts}（无法生成符合 [${minTotal},${maxTotal}] 件 + [${minRatio},${maxRatio}] 装载率的仓库）`
  );
}

// ---------- 调试用：仓库统计 ----------
export interface WarehouseStats {
  totalItems: number;
  totalValue: number;
  loadRatio: number;
  occupiedCells: number;
  byRarity: Record<Rarity, { count: number; value: number }>;
  byCategory: Record<string, number>;
}

export function summarize(w: Warehouse): WarehouseStats {
  const byRarity = {} as Record<Rarity, { count: number; value: number }>;
  for (const r of RARITIES) byRarity[r] = { count: 0, value: 0 };
  const byCategory: Record<string, number> = {};
  let occupiedCells = 0;

  for (const it of w.items) {
    byRarity[it.rarity].count++;
    byRarity[it.rarity].value += it.value;
    byCategory[it.cat] = (byCategory[it.cat] ?? 0) + 1;
    occupiedCells += it.shape.w * it.shape.h;
  }

  return {
    totalItems: w.items.length,
    totalValue: w.totalValue,
    loadRatio: occupiedCells / (w.cols * w.rows),
    occupiedCells,
    byRarity,
    byCategory,
  };
}

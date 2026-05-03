// 多桌蒙特卡洛模拟 — M8
// 详见 DESIGN.md §5.4
//
// 设计：玩家所在桌跑真实拍卖（M3~M7 链路）；其它桌仅模拟"统计后果"
// 不实际跑拍卖逻辑，避免单线程开销。
//
// 单手模拟（per table）：
//   1. 入场：所有桌内活人扣 blind
//   2. 抽样仓库总值 V（从 priorTotalValueRange）
//   3. 抽样成交价 P：以 V 为基准 ±20% 高斯
//   4. 性格权重决胜：随机选一名玩家中标
//   5. 中标者：chips -= P + V；其余：仅扣 blind
//   6. 检测淘汰
//
// 多手模拟：调用方循环 simulateOneHand。
//
// MTT 大局模拟：在 player's table 之外的所有桌每"一手"调用一次，
// 统计赛事剩余玩家数 + 平均筹码 → 用来更新 re-buy/add-on 的"全场平均"。

import { CONFIG } from '../config.ts';
import type { Personality, Player } from './types.ts';

// ---------- 性格权重 ----------
const WIN_WEIGHT: Record<Personality, number> = {
  conservative: 1.0,
  aggressive: 1.4,    // 激进派更易"一击成交"中标
  bluffer: 1.1,
};

// ---------- 简易 RNG ----------
function gaussian(rng: () => number): number {
  // Box-Muller
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------- 单手模拟 ----------
export interface TableHandResult {
  newChips: Map<string, number>;
  eliminated: string[];
  warehouseValue: number;
  closedPrice: number;
  winnerId: string | null;
  voided: boolean;
}

export interface SimulateHandOptions {
  rng?: () => number;
  /** 流拍概率（demo 默认 0.05） */
  voidProb?: number;
  /** 仓库价值随机区间（demo 默认 4500~8500） */
  warehouseValueRange?: [number, number];
}

export function simulateTableHand(
  players: Player[],
  blind: number,
  options: SimulateHandOptions = {}
): TableHandResult {
  const rng = options.rng ?? Math.random;
  const voidProb = options.voidProb ?? 0.05;
  const [vLo, vHi] = options.warehouseValueRange ?? [4500, 8500];

  // 仅活人参赛
  const aliveIdx: number[] = [];
  players.forEach((p, i) => {
    if (p.chips > 0) aliveIdx.push(i);
  });

  const newChips = new Map<string, number>();
  for (const p of players) newChips.set(p.id, p.chips);

  if (aliveIdx.length < 2) {
    return {
      newChips,
      eliminated: [],
      warehouseValue: 0,
      closedPrice: 0,
      winnerId: null,
      voided: true,
    };
  }

  // 1. 扣入场费
  const eliminated: string[] = [];
  for (const i of aliveIdx) {
    const p = players[i];
    const after = Math.max(0, (newChips.get(p.id) ?? 0) - blind);
    newChips.set(p.id, after);
    if (after === 0) eliminated.push(p.id);
  }

  // 2. 抽样仓库总值（独立于玩家筹码）
  const V = Math.round(vLo + rng() * (vHi - vLo));

  // 3. 流拍判定
  if (rng() < voidProb) {
    return {
      newChips, eliminated,
      warehouseValue: V, closedPrice: 0,
      winnerId: null, voided: true,
    };
  }

  // 4. 每位活人按"性格风险因子 × 自己筹码"产生一个虚拟报价（受筹码上限）
  // 这样模拟现实中"筹码=报价上限"的约束，避免出现"全员付不起"
  const RISK: Record<Personality, number> = {
    conservative: 0.65 + 0.10 * rng(),  // 65~75% all-in
    aggressive:   0.90 + 0.10 * rng(),  // 90~100% all-in
    bluffer:      0.75 + 0.10 * rng(),  // 75~85% all-in
  };
  const survivors = aliveIdx.filter((i) => (newChips.get(players[i].id) ?? 0) > 0);
  if (survivors.length === 0) {
    return {
      newChips, eliminated,
      warehouseValue: V, closedPrice: 0,
      winnerId: null, voided: true,
    };
  }
  const bidsArr = survivors.map((i) => {
    const p = players[i];
    const personality = p.personality ?? 'conservative';
    const factor = RISK[personality] * WIN_WEIGHT[personality];
    const chips = newChips.get(p.id) ?? 0;
    // 加微噪声（±15%），并 clamp 到筹码上限
    const noisy = chips * factor * (1 + (rng() - 0.5) * 0.30);
    return Math.min(chips, Math.max(1, Math.round(noisy)));
  });

  // 5. 决胜：报价最高者中标
  let bestIdx = 0;
  for (let i = 1; i < bidsArr.length; i++) {
    if (bidsArr[i] > bidsArr[bestIdx]) bestIdx = i;
  }
  const winnerIdx = survivors[bestIdx];
  const winnerId = players[winnerIdx].id;
  const P = bidsArr[bestIdx];

  // 6. 中标者：扣 P，加 V （sellbackRate=1.0）
  const winnerCurrent = newChips.get(winnerId)!;
  newChips.set(winnerId, winnerCurrent - P + V);

  return {
    newChips, eliminated,
    warehouseValue: V, closedPrice: P,
    winnerId, voided: false,
  };
}

// ---------- 多桌联合模拟（一"手"间隔） ----------
export interface SimulatedTable {
  id: string;
  players: Player[];
}

export interface MultiTableSnapshot {
  totalAlive: number;
  totalChips: number;
  avgChipsAlive: number;
  perTableResults: { tableId: string; result: TableHandResult }[];
}

/** 在所有非玩家所在桌跑一"手"模拟 */
export function simulateOtherTables(
  tables: SimulatedTable[],
  blind: number,
  rng: () => number = Math.random
): MultiTableSnapshot {
  const perTable: { tableId: string; result: TableHandResult }[] = [];
  const updatedTables: SimulatedTable[] = [];
  for (const t of tables) {
    const r = simulateTableHand(t.players, blind, { rng });
    perTable.push({ tableId: t.id, result: r });
    const newPlayers = t.players.map((p) => ({ ...p, chips: r.newChips.get(p.id) ?? 0 }));
    updatedTables.push({ ...t, players: newPlayers });
  }
  let totalAlive = 0;
  let totalChips = 0;
  for (const t of updatedTables) {
    for (const p of t.players) {
      if (p.chips > 0) {
        totalAlive++;
        totalChips += p.chips;
      }
    }
  }
  return {
    totalAlive,
    totalChips,
    avgChipsAlive: totalAlive > 0 ? Math.round(totalChips / totalAlive) : 0,
    perTableResults: perTable,
  };
}

// ---------- 跑完整其它桌赛事 ----------
export interface SimulateOtherTablesEndToEndOptions {
  rng?: () => number;
  /** 多少手才推一档盲注 */
  handsPerBlindLevel?: number;
  maxHands?: number;
}

export interface OtherTablesEndToEndResult {
  hands: { hand: number; blind: number; snapshot: MultiTableSnapshot }[];
  finalAliveByTable: { tableId: string; alivePlayers: number }[];
  totalSurvivors: number;
}

export function simulateOtherTablesEndToEnd(
  tables: SimulatedTable[],
  options: SimulateOtherTablesEndToEndOptions = {}
): OtherTablesEndToEndResult {
  const rng = options.rng ?? Math.random;
  const hpl = options.handsPerBlindLevel ?? 3;
  const maxHands = options.maxHands ?? 60;
  const blinds = CONFIG.tournament.blindLevels;

  let cur = tables.map((t) => ({ ...t, players: t.players.map((p) => ({ ...p })) }));
  const hands: { hand: number; blind: number; snapshot: MultiTableSnapshot }[] = [];
  let total = cur.reduce((s, t) => s + t.players.filter((p) => p.chips > 0).length, 0);

  for (let h = 1; h <= maxHands && total >= 2; h++) {
    const blindIdx = Math.min(Math.floor((h - 1) / hpl), blinds.length - 1);
    const blind = blinds[blindIdx];
    const snap = simulateOtherTables(cur, blind, rng);
    hands.push({ hand: h, blind, snapshot: snap });
    // 更新 cur
    cur = cur.map((t) => {
      const r = snap.perTableResults.find((x) => x.tableId === t.id)!;
      return {
        ...t,
        players: t.players.map((p) => ({ ...p, chips: r.result.newChips.get(p.id) ?? 0 })),
      };
    });
    total = snap.totalAlive;
  }

  return {
    hands,
    finalAliveByTable: cur.map((t) => ({
      tableId: t.id,
      alivePlayers: t.players.filter((p) => p.chips > 0).length,
    })),
    totalSurvivors: total,
  };
}

// M3 拍卖核心验证 — 脚本化场景
// 不接 UI，只调 core/auction，断言结果

import { GENERALS } from '../data/characters.ts';
import { generateWarehouse } from '../core/warehouse.ts';
import { createAuction, submitRoundBids, settle } from '../core/auction.ts';
import type { Bid, Player, Warehouse } from '../core/types.ts';

// ---------- 测试 helpers ----------
function makePlayers(): Player[] {
  return [
    { id: 'p1', name: '我', isHuman: true, general: GENERALS.zhugeliang, chips: 1000 },
    { id: 'p2', name: '曹操', isHuman: false, general: GENERALS.caocao, chips: 1000, personality: 'aggressive' },
    { id: 'p3', name: '司马懿', isHuman: false, general: GENERALS.simayi, chips: 1000, personality: 'bluffer' },
    { id: 'p4', name: '荀彧', isHuman: false, general: GENERALS.zhugeliang, chips: 1000, personality: 'conservative' },
  ];
}

function bidsOf(spec: Record<string, number | 'pass'>): Map<string, Bid> {
  const m = new Map<string, Bid>();
  for (const [id, v] of Object.entries(spec)) {
    m.set(id, v === 'pass' ? { kind: 'pass' } : { kind: 'bid', amount: v });
  }
  return m;
}

function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

// ---------- 场景定义 ----------
export interface ScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  rounds: { r: number; bids: string; outcome: string }[];
  settlement?: string;
}

function makeWarehouse(): Warehouse {
  // 用固定种子，让仓库总值可重现，便于断言结算利润
  return generateWarehouse({ seed: 42 });
}

// ===== Scenario A: ×2.0 一击成交（R1 结束）=====
function scenarioA(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // R1: P1=1000, P2=400, P3=200, P4=pass
  // 1st=1000, 2nd=400, threshold=2.0 → 1000 >= 400×2.0=800 ✓
  const r1 = submitRoundBids(state, bidsOf({ p1: 1000, p2: 400, p3: 200, p4: 'pass' }));
  state = r1.state;

  const expected = 'p1 win at price 1000, R1';
  const closed = state.closed!;
  const actual = closed.winnerId === 'p1' && closed.price === 1000 && closed.closingRound === 1
    ? expected
    : `winnerId=${closed.winnerId}, price=${closed.price}, R${closed.closingRound}`;

  // 结算
  const settleR = settle(state);
  const winner = settleR.players.find((p) => p.id === 'p1')!;
  const settlement = `p1 chips: 1000 - 100(entry) - 1000(price) + ${settleR.sellbackValue}(sellback) = ${winner.chips}; profit=${settleR.winnerProfit}`;

  return {
    name: 'A. ×2.0 一击成交',
    description: 'R1 第一名是第二名 2.5 倍 → 立即成交',
    passed: actual === expected,
    expected,
    actual,
    rounds: [{ r: 1, bids: 'p1=1000, p2=400, p3=200, p4=pass', outcome: 'closed: p1 wins @1000' }],
    settlement,
  };
}

// ===== Scenario B: 拖到 R5 险胜 =====
function scenarioB(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  const rounds: { r: number; bids: string; outcome: string }[] = [];

  // 设计：每轮 1st 都不达阈值 → 拖到 R5 才成交
  // R1: 100, 80, 60, 40 → 100 >= 80×2.0=160? NO
  // R2: 200, 180, 160, 140 → 200 >= 180×1.6=288? NO
  // R3: 300, 280, 260, 240 → 300 >= 280×1.3=364? NO
  // R4: 400, 380, 360, 340 → 400 >= 380×1.1=418? NO
  // R5: 500, 480, 460, 440 → 500 >= 480×1.0=480 ✓ → p1 win R5 @500
  const bidPlan: [number, Record<string, number>][] = [
    [1, { p1: 100, p2: 80, p3: 60, p4: 40 }],
    [2, { p1: 200, p2: 180, p3: 160, p4: 140 }],
    [3, { p1: 300, p2: 280, p3: 260, p4: 240 }],
    [4, { p1: 400, p2: 380, p3: 360, p4: 340 }],
    [5, { p1: 500, p2: 480, p3: 460, p4: 440 }],
  ];

  for (const [r, spec] of bidPlan) {
    const res = submitRoundBids(state, bidsOf(spec));
    state = res.state;
    rounds.push({
      r,
      bids: Object.entries(spec).map(([k, v]) => `${k}=${v}`).join(', '),
      outcome: res.isClosed
        ? `closed: winner=${state.closed!.winnerId} price=${state.closed!.price}`
        : 'continue',
    });
    if (res.isClosed) break;
  }

  const expected = 'p1 win at 500, R5';
  const closed = state.closed!;
  const actual = closed.winnerId === 'p1' && closed.price === 500 && closed.closingRound === 5
    ? expected
    : `winnerId=${closed.winnerId}, price=${closed.price}, R${closed.closingRound}`;

  const settleR = settle(state);
  const winner = settleR.players.find((p) => p.id === 'p1')!;
  const settlement = `p1 chips: 1000 - 100 - 500 + ${settleR.sellbackValue} = ${winner.chips}; profit=${settleR.winnerProfit}`;

  return {
    name: 'B. 拖到 R5 险胜',
    description: '5 轮均小幅领先，最后阈值=1.0 才成交',
    passed: actual === expected,
    expected,
    actual,
    rounds,
    settlement,
  };
}

// ===== Scenario C: 全员 pass → 流拍 =====
function scenarioC(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  const r1 = submitRoundBids(state, bidsOf({ p1: 'pass', p2: 'pass', p3: 'pass', p4: 'pass' }));
  state = r1.state;

  const expected = 'voided (winnerId=null), R1';
  const closed = state.closed!;
  const actual = closed.winnerId === null && closed.price === 0 && closed.closingRound === 1
    ? expected
    : `winnerId=${closed.winnerId}, price=${closed.price}, R${closed.closingRound}`;

  // 结算（流拍时无胜者）
  const settleR = settle(state);
  const settlement = `各玩家入场费 100 已沉没；筹码均为 900；sellbackValue=${settleR.sellbackValue}`;

  return {
    name: 'C. 全员 pass → 流拍',
    description: 'R1 全员报 0 → 直接流拍，入场费沉没',
    passed: actual === expected && settleR.players.every((p) => p.chips === 900),
    expected,
    actual,
    rounds: [{ r: 1, bids: 'all pass', outcome: 'voided' }],
    settlement,
  };
}

// ===== Scenario D: R5 并列最高（随机裁决）=====
function scenarioD(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // 拖到 R5 让 p1 和 p2 并列 500
  const bidPlan: [number, Record<string, number>][] = [
    [1, { p1: 100, p2: 100, p3: 60, p4: 40 }],   // 1st=100=100? 不达 ×2.0=200, 继续
    [2, { p1: 200, p2: 200, p3: 160, p4: 140 }], // 不达 ×1.6=320
    [3, { p1: 300, p2: 300, p3: 260, p4: 240 }], // 不达 ×1.3=390
    [4, { p1: 400, p2: 400, p3: 360, p4: 340 }], // 不达 ×1.1=440
    [5, { p1: 500, p2: 500, p3: 460, p4: 440 }], // R5 并列 500 → 随机裁决
  ];

  // 用固定 rng（返回 0 → 选 tied 中第一个 → p1）
  const rng = fixedRng([0]);

  const rounds: { r: number; bids: string; outcome: string }[] = [];
  for (const [r, spec] of bidPlan) {
    const res = submitRoundBids(state, bidsOf(spec), rng);
    state = res.state;
    rounds.push({
      r,
      bids: Object.entries(spec).map(([k, v]) => `${k}=${v}`).join(', '),
      outcome: res.isClosed
        ? `closed: winner=${state.closed!.winnerId} price=${state.closed!.price}`
        : 'continue',
    });
    if (res.isClosed) break;
  }

  const expected = 'p1 win at 500, R5 (rng[0] picks first tied)';
  const closed = state.closed!;
  const actual = closed.winnerId === 'p1' && closed.price === 500 && closed.closingRound === 5
    ? expected
    : `winnerId=${closed.winnerId}, price=${closed.price}, R${closed.closingRound}`;

  return {
    name: 'D. R5 并列裁决',
    description: 'R5 P1 与 P2 同报 500，固定 rng 选第一名（P1）',
    passed: actual === expected,
    expected,
    actual,
    rounds,
  };
}

// ===== Scenario E: 入场费扣除验证 =====
function scenarioE(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  const state = createAuction(warehouse, players, { entryFee: 250 });

  const expected = 'all players chips = 1000 - 250 = 750';
  const allCorrect = state.players.every((p) => p.chips === 750);
  const actual = allCorrect ? expected : `chips: ${state.players.map((p) => p.chips).join(',')}`;

  return {
    name: 'E. 入场费扣除',
    description: '4 玩家各 1000 筹码，入场费 250，开局后均剩 750',
    passed: allCorrect,
    expected,
    actual,
    rounds: [],
  };
}

// ===== Scenario F: 利润计算（中标价 < 仓库总值 → 赚） =====
function scenarioF(): ScenarioResult {
  const players = makePlayers();
  const warehouse = makeWarehouse();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // 让 p1 极低价捡漏：报 200 vs 其他全 pass
  // 1st=200, 2nd=0, 全场只 1 人出价 → 必成交（meetsThreshold 分支 second=0）
  const r1 = submitRoundBids(state, bidsOf({ p1: 200, p2: 'pass', p3: 'pass', p4: 'pass' }));
  state = r1.state;

  const settleR = settle(state);
  const winner = settleR.players.find((p) => p.id === 'p1')!;
  const expectedProfit = warehouse.totalValue - 200;
  const actualProfit = settleR.winnerProfit;

  const passed = state.closed?.winnerId === 'p1'
    && state.closed?.price === 200
    && actualProfit === expectedProfit
    && winner.chips === 1000 - 100 - 200 + warehouse.totalValue;

  return {
    name: 'F. 全员弃权 → 1人独中',
    description: '只有 p1 出价 200，其余 pass → p1 必中标，捡漏赚 (totalValue-200)',
    passed,
    expected: `profit=${expectedProfit}, p1.chips=${1000 - 100 - 200 + warehouse.totalValue}`,
    actual: `profit=${actualProfit}, p1.chips=${winner.chips}`,
    rounds: [{ r: 1, bids: 'p1=200, others=pass', outcome: `p1 wins @200` }],
    settlement: `仓库总值 ${warehouse.totalValue}, sellback=${settleR.sellbackValue}`,
  };
}

export function runAllScenarios(): ScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD(), scenarioE(), scenarioF()];
}

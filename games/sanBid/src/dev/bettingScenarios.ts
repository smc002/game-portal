// M5 押注玩法验证 — 脚本化场景
// 验证：
//   - 押注金提交即扣
//   - 成交那一轮的押注：命中按 multiplier 返还，未中没收
//   - 未成交那几轮的押注：原额退回
//   - 流拍：所有押注原额退回
//   - 押注金额上限校验
//   - 逐轮 multiplier 递减（4.0 → 2.0）

import { GENERALS } from '../data/characters.ts';
import { generateWarehouse } from '../core/warehouse.ts';
import { createAuction, settle, submitRoundBids } from '../core/auction.ts';
import { applyStakePayouts, settleStakes, validateStake } from '../core/betting.ts';
import type { Bid, Player, Stake } from '../core/types.ts';

function makePlayers(): Player[] {
  return [
    { id: 'p1', name: '我', isHuman: true, general: GENERALS.zhugeliang, chips: 1000 },
    { id: 'p2', name: '曹操', isHuman: false, general: GENERALS.caocao, chips: 1000 },
    { id: 'p3', name: '司马懿', isHuman: false, general: GENERALS.simayi, chips: 1000 },
    { id: 'p4', name: '影武者', isHuman: false, general: GENERALS.zhugeliang, chips: 1000 },
  ];
}

function bidsOf(spec: Record<string, number | 'pass'>): Map<string, Bid> {
  const m = new Map<string, Bid>();
  for (const [id, v] of Object.entries(spec)) {
    m.set(id, v === 'pass' ? { kind: 'pass' } : { kind: 'bid', amount: v });
  }
  return m;
}

function stakesOf(spec: Record<string, [number, number] | null>): Map<string, Stake | null> {
  const m = new Map<string, Stake | null>();
  for (const [id, v] of Object.entries(spec)) {
    m.set(id, v ? { amount: v[0], basisBid: v[1] } : null);
  }
  return m;
}

export interface BettingScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  details: string[];
}

// ===== M5-A: 命中（成交那轮，押 ±10%）=====
function scenarioA(): BettingScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 }); // totalValue = 6156（M3 已知）
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  details.push(`仓库真实总值 = ${warehouse.totalValue}`);

  // p1 报 6000，押注 50；p2~p4 pass。1st=6000, 2nd=0 → 必成交于 R1
  // 6000 ±10% = [5400, 6600]，6156 在区间内 → 命中
  // R1 押注倍率 = 4.0，押 50 → 返还 200
  const r1 = submitRoundBids(
    state,
    bidsOf({ p1: 6000, p2: 'pass', p3: 'pass', p4: 'pass' }),
    Math.random,
    stakesOf({ p1: [50, 6000], p2: null, p3: null, p4: null })
  );
  state = r1.state;

  details.push(`成交: winner=${state.closed!.winnerId} price=${state.closed!.price} R${state.closed!.closingRound}`);

  // 此时 p1 chips = 1000 - 100(entry) - 50(stake) = 850
  details.push(`p1 当前筹码（已扣入场费 + 押注）: ${state.players.find((p) => p.id === 'p1')!.chips}（应为 850）`);

  // 主结算：中标 → -6000 + 6156(sellback) = +156
  const main = settle(state);
  // 押注结算
  const stakeSettle = settleStakes(state);
  const finalPlayers = applyStakePayouts(main.players, stakeSettle);

  const p1Final = finalPlayers.find((p) => p.id === 'p1')!;
  // 1000 - 100 - 50 - 6000 + 6156 + 200(stake payout) = 1206
  const expected = 1000 - 100 - 50 - 6000 + 6156 + 200;
  details.push(`p1 最终筹码: ${p1Final.chips}（应为 ${expected}）`);

  const stakeEntry = stakeSettle.entries.find((e) => e.playerId === 'p1')!;
  details.push(`p1 押注结算: outcome=${stakeEntry.outcome}, payout=${stakeEntry.payout}（应 win × 200）`);

  return {
    name: 'M5-A. 押对 ×4.0 返利',
    description: '成交那轮（R1）押 50，区间命中 → 返还 200',
    passed: p1Final.chips === expected && stakeEntry.outcome === 'win' && stakeEntry.payout === 200,
    details,
  };
}

// ===== M5-B: 未中（成交那轮，押偏离）=====
function scenarioB(): BettingScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 }); // totalValue = 6156
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // p1 报 6000 押注（命中区间 5400~6600），但 basisBid=2000 → 区间 1800~2200，不含 6156
  // 实际 demo 中我们让 p1 故意押"偏离的 basisBid"——必须 basisBid==bidAmount
  // 改为：p1 报 2000 押 50（区间 1800~2200），不含 6156 → lose
  // 但 R1 阈值 ×2.0；p1=2000, 其他 pass，2nd=0 → 必成交
  const r1 = submitRoundBids(
    state,
    bidsOf({ p1: 2000, p2: 'pass', p3: 'pass', p4: 'pass' }),
    Math.random,
    stakesOf({ p1: [50, 2000], p2: null, p3: null, p4: null })
  );
  state = r1.state;

  const stakeSettle = settleStakes(state);
  const stakeEntry = stakeSettle.entries.find((e) => e.playerId === 'p1')!;
  details.push(`仓库真实总值 ${warehouse.totalValue}, 押注区间 1800~2200 → 偏离`);
  details.push(`stake outcome=${stakeEntry.outcome}, payout=${stakeEntry.payout}（应 lose × 0）`);

  return {
    name: 'M5-B. 押错没收',
    description: '成交那轮押 50 但价值带不含真实总值 → 没收',
    passed: stakeEntry.outcome === 'lose' && stakeEntry.payout === 0,
    details,
  };
}

// ===== M5-C: 未成交那轮的押注原额退回 =====
function scenarioC(): BettingScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // R1 押 100（不达阈值，未成交）→ R2 不押 → R2 一击成交
  // R1: 100, 80, ... → 100 < 80×2.0=160，不达
  // R2: 5000 + others pass → 必成交
  const r1 = submitRoundBids(
    state,
    bidsOf({ p1: 100, p2: 80, p3: 'pass', p4: 'pass' }),
    Math.random,
    stakesOf({ p1: [100, 100], p2: null, p3: null, p4: null })
  );
  state = r1.state;
  details.push(`R1 isClosed=${r1.isClosed}（应为 false）`);

  const r2 = submitRoundBids(
    state,
    bidsOf({ p1: 5000, p2: 'pass', p3: 'pass', p4: 'pass' }),
    Math.random
  );
  state = r2.state;
  details.push(`R2 isClosed=${r2.isClosed} winner=${state.closed!.winnerId}`);

  const stakeSettle = settleStakes(state);
  const r1Entry = stakeSettle.entries.find((e) => e.playerId === 'p1' && e.round === 1)!;
  details.push(`R1 押注结算: outcome=${r1Entry.outcome}, payout=${r1Entry.payout}（应 refund × 100）`);

  return {
    name: 'M5-C. 未成交轮原额退回',
    description: 'R1 押 100 未成交 → R2 才成交 → R1 押注按 refund 处理',
    passed: r1Entry.outcome === 'refund' && r1Entry.payout === 100,
    details,
  };
}

// ===== M5-D: 流拍 → 所有押注原额退回 =====
function scenarioD(): BettingScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // 先在 R1 押 50，再全员 pass → 流拍
  // R1: p1=200, p2=150 → 200 < 150×2.0=300，未成交
  // R2: 全员 pass → 流拍
  const r1 = submitRoundBids(
    state,
    bidsOf({ p1: 200, p2: 150, p3: 'pass', p4: 'pass' }),
    Math.random,
    stakesOf({ p1: [50, 200], p2: null, p3: null, p4: null })
  );
  state = r1.state;
  details.push(`R1 isClosed=${r1.isClosed}`);

  const r2 = submitRoundBids(
    state,
    bidsOf({ p1: 'pass', p2: 'pass', p3: 'pass', p4: 'pass' })
  );
  state = r2.state;
  details.push(`R2 流拍: winner=${state.closed!.winnerId}`);

  const stakeSettle = settleStakes(state);
  const r1Entry = stakeSettle.entries.find((e) => e.playerId === 'p1' && e.round === 1)!;
  details.push(`流拍场景下 R1 押注: outcome=${r1Entry.outcome} payout=${r1Entry.payout}（应 refund × 50）`);

  return {
    name: 'M5-D. 流拍 → 押注全退',
    description: '本仓流拍 → 所有轮次押注按 refund',
    passed: r1Entry.outcome === 'refund' && r1Entry.payout === 50,
    details,
  };
}

// ===== M5-E: 押注上限校验 =====
function scenarioE(): BettingScenarioResult {
  const details: string[] = [];
  const player: Player = { id: 'p1', name: '我', isHuman: true, general: GENERALS.zhugeliang, chips: 1000 };

  // 上限 50% × 1000 = 500
  const ok = validateStake(player, { amount: 400, basisBid: 1000 }, 1000);
  const overLimit = validateStake(player, { amount: 600, basisBid: 1000 }, 1000);
  const negative = validateStake(player, { amount: 0, basisBid: 1000 }, 1000);
  const passBid = validateStake(player, { amount: 100, basisBid: 0 }, 0);

  details.push(`合法 (400, basis 1000, bid 1000): ok=${ok.ok}`);
  details.push(`超限 (600 > 500): ok=${overLimit.ok}, reason=${overLimit.reason}`);
  details.push(`零额: ok=${negative.ok}, reason=${negative.reason}`);
  details.push(`pass 时押注: ok=${passBid.ok}, reason=${passBid.reason}`);

  return {
    name: 'M5-E. 押注上限校验',
    description: 'validateStake: 合法 / 超限 / 零额 / pass 都正确',
    passed: ok.ok && !overLimit.ok && !negative.ok && !passBid.ok,
    details,
  };
}

// ===== M5-F: 逐轮 multiplier 递减验证 =====
function scenarioF(): BettingScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 }); // totalValue = 6156
  const expectedMul = [4.0, 3.5, 3.0, 2.5, 2.0];
  const results: number[] = [];

  // 对每一轮 R∈{1..5}，构造一个"在 R 轮成交且 p1 押对"的场景，验证 multiplier
  // 关键：需要一个 basisBid 使其 ±10% 区间含 6156
  // basisBid = 6000 → 区间 5400~6600 含 6156 ✓
  for (let R = 1; R <= 5; R++) {
    const players = makePlayers();
    let state = createAuction(warehouse, players, { entryFee: 100 });

    for (let r = 1; r < R; r++) {
      // 让前 R-1 轮不成交：1st 紧贴 2nd（差 1）
      const a = 100 + r * 10;
      const res = submitRoundBids(
        state,
        bidsOf({ p1: a, p2: a - 1, p3: a - 2, p4: a - 3 })
      );
      state = res.state;
    }
    // R 轮：p1=6000 push, others=pass → 必成交
    const final = submitRoundBids(
      state,
      bidsOf({ p1: 6000, p2: 'pass', p3: 'pass', p4: 'pass' }),
      Math.random,
      stakesOf({ p1: [10, 6000], p2: null, p3: null, p4: null })
    );
    state = final.state;
    const ss = settleStakes(state);
    const entry = ss.entries.find((e) => e.playerId === 'p1' && e.round === R);
    if (!entry || entry.outcome !== 'win') {
      details.push(`R${R}: 未命中（outcome=${entry?.outcome}）`);
      results.push(0);
      continue;
    }
    const ratio = entry.payout / 10;
    results.push(ratio);
    details.push(`R${R} 押 10 → payout ${entry.payout}, 倍率 ${ratio.toFixed(1)}（期望 ${expectedMul[R - 1]}）`);
  }

  const passed = results.every((r, i) => Math.abs(r - expectedMul[i]) < 0.01);
  return {
    name: 'M5-F. 5 轮 multiplier 递减',
    description: '每轮成交，押 10 命中 → payout 应分别为 40 / 35 / 30 / 25 / 20',
    passed,
    details,
  };
}

export function runAllBettingScenarios(): BettingScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD(), scenarioE(), scenarioF()];
}

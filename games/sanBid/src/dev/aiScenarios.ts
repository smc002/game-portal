// M6 AI 场景验证
// 验证：
//   - 4 AI 桌能跑到拍卖结束（成交或流拍），不抛错
//   - 估值器能用（不为 NaN，不为负）
//   - 性格行为差异：保守/激进/诈唬出价分布不同
//   - 100 局模拟统计：流拍率、成交轮次分布、人均利润等

import { GENERALS } from '../data/characters.ts';
import { generateWarehouse } from '../core/warehouse.ts';
import { createAuction, settle, submitRoundBids } from '../core/auction.ts';
import { applyStakePayouts, settleStakes } from '../core/betting.ts';
import { decideAi, estimateWarehouseValue } from '../core/ai.ts';
import type { Bid, Personality, Player, Stake } from '../core/types.ts';

function makeAiPlayers(): Player[] {
  // 4 AI：诸葛亮(保守) + 曹操(激进) + 司马懿(诈唬) + 诸葛亮(诈唬)
  return [
    { id: 'p1', name: '诸葛亮·保守',  isHuman: false, general: GENERALS.zhugeliang, chips: 1000, personality: 'conservative' },
    { id: 'p2', name: '曹操·激进',    isHuman: false, general: GENERALS.caocao,    chips: 1000, personality: 'aggressive' },
    { id: 'p3', name: '司马懿·诈唬',  isHuman: false, general: GENERALS.simayi,    chips: 1000, personality: 'bluffer' },
    { id: 'p4', name: '诸葛亮·诈唬',  isHuman: false, general: GENERALS.zhugeliang, chips: 1000, personality: 'bluffer' },
  ];
}

// 简易 LCG 用于可重现的 demo
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export interface AiScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  details: string[];
}

// ===== M6-A: 单场 AI 拍卖能跑完 =====
function scenarioA(): AiScenarioResult {
  const details: string[] = [];
  const rng = lcg(12345);
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makeAiPlayers();

  let state = createAuction(warehouse, players, { entryFee: 100 }, rng);
  details.push(`仓库总值 ${warehouse.totalValue}，4 AI 入场`);

  let safety = 10;
  while (!state.closed && safety-- > 0) {
    const round = state.rounds.length + 1;
    const bids = new Map<string, Bid>();
    const stakes = new Map<string, Stake | null>();
    for (const p of state.players) {
      const decision = decideAi(state, p, { rng });
      bids.set(p.id, decision.bid);
      stakes.set(p.id, decision.stake);
    }
    const desc = state.players
      .map((p) => {
        const b = bids.get(p.id)!;
        const s = stakes.get(p.id);
        const bidStr = b.kind === 'bid' ? String(b.amount) : 'pass';
        const stakeStr = s ? `+押${s.amount}` : '';
        return `${p.name}=${bidStr}${stakeStr}`;
      })
      .join(' / ');
    details.push(`R${round}: ${desc}`);
    const res = submitRoundBids(state, bids, rng, stakes);
    state = res.state;
  }

  const closed = state.closed!;
  details.push(`成交: winner=${closed.winnerId} price=${closed.price} R${closed.closingRound}`);

  const main = settle(state);
  const sett = settleStakes(state);
  const finalPlayers = applyStakePayouts(main.players, sett);
  for (const p of finalPlayers) {
    details.push(`${p.name} 最终筹码 ${p.chips}（变动 ${p.chips - 1000})`);
  }

  return {
    name: 'M6-A. 4 AI 单场拍卖',
    description: '4 个 AI 各按性格出价 + 押注，跑到拍卖结束',
    passed: !!state.closed && state.rounds.length >= 1,
    details,
  };
}

// ===== M6-B: 估值器健康 =====
function scenarioB(): AiScenarioResult {
  const details: string[] = [];
  const rng = lcg(777);
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makeAiPlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 }, rng);

  // 各 AI 第一轮估值
  const initial = state.players.map((p) => ({
    name: p.name,
    est: estimateWarehouseValue(state, p, { noiseScale: 0, rng }),
  }));
  for (const x of initial) {
    details.push(`${x.name} R1 估值 = ${x.est}（仓库真实 ${warehouse.totalValue}）`);
  }

  // 跑到 R3，再看估值（理论上应更准）
  for (let r = 1; r <= 2; r++) {
    const bids = new Map<string, Bid>();
    for (const p of state.players) {
      const d = decideAi(state, p, { rng });
      bids.set(p.id, d.bid);
    }
    // 强制不达阈值：把所有出价折半（仅为了走流程）
    const dampened = new Map<string, Bid>();
    for (const [id, b] of bids) {
      if (b.kind === 'bid') {
        dampened.set(id, { kind: 'bid', amount: Math.floor(b.amount / (r + 1)) });
      } else {
        dampened.set(id, { kind: 'pass' });
      }
    }
    const res = submitRoundBids(state, dampened, rng);
    if (res.isClosed) {
      details.push(`意外 R${r} 成交，无法继续测估值`);
      break;
    }
    state = res.state;
  }

  // R3 后估值（司马懿应该 R4 全揭示，看 R3 末估值）
  // 但 R3 末（即将 R4）司马懿已触发 round-start → 看 R3 末估值反映
  const after = state.players.map((p) => ({
    name: p.name,
    est: estimateWarehouseValue(state, p, { noiseScale: 0, rng }),
  }));
  for (const x of after) {
    details.push(`${x.name} R3 末估值 = ${x.est}`);
  }

  const allFinite = [...initial, ...after].every((x) => Number.isFinite(x.est) && x.est >= 0);
  const simayiAfter = after.find((x) => x.name === '司马懿·诈唬')!;
  const simayiAccurate = Math.abs(simayiAfter.est - warehouse.totalValue) / warehouse.totalValue < 0.25;
  details.push(`司马懿 R3 末估值 vs 真实总值: 误差 ${(Math.abs(simayiAfter.est - warehouse.totalValue) / warehouse.totalValue * 100).toFixed(1)}%（应 < 25%）`);

  return {
    name: 'M6-B. 估值器健康',
    description: 'AI 估值不为 NaN/负数；司马懿 R4 全揭示后估值贴近真值',
    passed: allFinite && simayiAccurate,
    details,
  };
}

// ===== M6-C: 100 局压力（无报错 + 流拍率合理） =====
function scenarioC(): AiScenarioResult {
  const details: string[] = [];
  let voided = 0;
  let won = 0;
  const closingRounds: number[] = [];
  let errors = 0;

  for (let i = 0; i < 100; i++) {
    try {
      const rng = lcg(i + 1000);
      const warehouse = generateWarehouse({ seed: i + 1 });
      const players = makeAiPlayers();
      let state = createAuction(warehouse, players, { entryFee: 100 }, rng);

      let safety = 10;
      while (!state.closed && safety-- > 0) {
        const bids = new Map<string, Bid>();
        const stakes = new Map<string, Stake | null>();
        for (const p of state.players) {
          const d = decideAi(state, p, { rng });
          bids.set(p.id, d.bid);
          stakes.set(p.id, d.stake);
        }
        const res = submitRoundBids(state, bids, rng, stakes);
        state = res.state;
      }
      if (!state.closed) {
        errors++;
        continue;
      }
      if (state.closed.winnerId === null) voided++;
      else won++;
      closingRounds.push(state.closed.closingRound);
    } catch (e) {
      errors++;
    }
  }

  const avgClosing = closingRounds.reduce((a, b) => a + b, 0) / Math.max(closingRounds.length, 1);
  const roundDist: Record<number, number> = {};
  for (const r of closingRounds) roundDist[r] = (roundDist[r] ?? 0) + 1;

  details.push(`100 局：成交 ${won}, 流拍 ${voided}, 错误 ${errors}`);
  details.push(`平均成交轮次：${avgClosing.toFixed(2)}`);
  details.push(`成交轮次分布：${[1,2,3,4,5].map(r => `R${r}=${roundDist[r] ?? 0}`).join(', ')}`);

  return {
    name: 'M6-C. 100 局 AI 压力',
    description: '4 AI 跑 100 局：无错误 + 流拍率合理 (<30%)',
    passed: errors === 0 && voided / 100 < 0.30,
    details,
  };
}

// ===== M6-D: 性格出价行为差异 =====
function scenarioD(): AiScenarioResult {
  const details: string[] = [];
  const rng = lcg(2024);
  const warehouse = generateWarehouse({ seed: 42 });

  // 用 100000 chips（远超仓库总值 ~6000~7000），避免被 chips 上限 clamp 平
  // 这样性格的"心理上限"差异才能体现在出价上
  const players: Player[] = [
    { id: 'pa', name: '保守', isHuman: false, general: GENERALS.zhugeliang, chips: 100000, personality: 'conservative' },
    { id: 'pb', name: '激进', isHuman: false, general: GENERALS.zhugeliang, chips: 100000, personality: 'aggressive' },
    { id: 'pc', name: '诈唬', isHuman: false, general: GENERALS.zhugeliang, chips: 100000, personality: 'bluffer' },
    { id: 'pd', name: '保守2', isHuman: false, general: GENERALS.zhugeliang, chips: 100000, personality: 'conservative' },
  ];

  // 100 次相同状态下 R1 的报价分布
  const bidsByPersonality: Record<Personality, number[]> = {
    conservative: [], aggressive: [], bluffer: [],
  };

  for (let i = 0; i < 100; i++) {
    const sample = lcg(i + 5000);
    const state = createAuction(warehouse, players, { entryFee: 100 }, sample);
    for (const p of state.players) {
      const d = decideAi(state, p, { rng: sample });
      const amt = d.bid.kind === 'bid' ? d.bid.amount : 0;
      bidsByPersonality[p.personality!].push(amt);
    }
  }

  function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

  const avgC = mean(bidsByPersonality.conservative);
  const avgA = mean(bidsByPersonality.aggressive);
  const avgB = mean(bidsByPersonality.bluffer);
  details.push(`R1 平均报价 — 保守 ${avgC.toFixed(0)}, 激进 ${avgA.toFixed(0)}, 诈唬 ${avgB.toFixed(0)}`);
  details.push(`期望关系：激进 > 保守 > 诈唬（诈唬第 1 轮压低）`);

  // 激进必须远高于保守，诈唬应低于保守
  const passed = avgA > avgC * 1.5 && avgB < avgC;
  return {
    name: 'M6-D. 性格出价分布',
    description: 'R1 平均报价：激进 ≫ 保守 > 诈唬',
    passed,
    details,
  };
}

export function runAllAiScenarios(): AiScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD()];
}

// M4 竞拍人技能验证 — 脚本化场景
// 验证：
//   - 诸葛亮 'after-bid' → 揭 2 件 quality（仅自己可见）
//   - 曹操   'after-bid' → 揭 2 件 silhouette（仅自己可见）
//   - 司马懿 'round-start' R4 → 揭全部 quality+silhouette（仅自己可见）
//   - 信息隔离：玩家间互不看到他人技能产出
//   - 拍卖成交后技能不再触发

import { GENERALS } from '../data/characters.ts';
import { generateWarehouse } from '../core/warehouse.ts';
import { createAuction, submitRoundBids } from '../core/auction.ts';
import type { Bid, Player } from '../core/types.ts';

function makePlayers(): Player[] {
  // p1=诸葛亮, p2=曹操, p3=司马懿, p4=（再用诸葛亮做对照）
  return [
    { id: 'p1', name: '我·诸葛亮',  isHuman: true,  general: GENERALS.zhugeliang, chips: 1000 },
    { id: 'p2', name: '曹操',        isHuman: false, general: GENERALS.caocao,    chips: 1000 },
    { id: 'p3', name: '司马懿',      isHuman: false, general: GENERALS.simayi,    chips: 1000 },
    { id: 'p4', name: '诸葛亮影武者', isHuman: false, general: GENERALS.zhugeliang, chips: 1000 },
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

export interface SkillScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  details: string[];
}

// ===== M4-A: 诸葛亮 R1 出价后揭 2 件品质 =====
function scenarioA(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  // 用 Math.random 但是行为一致即可
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // R1 不达阈值（小幅领先）→ 触发技能
  const r1 = submitRoundBids(state, bidsOf({ p1: 100, p2: 90, p3: 80, p4: 70 }));
  state = r1.state;
  const isContinue = !r1.isClosed;
  details.push(`R1 isClosed = ${r1.isClosed}（应为 false → 进入 R2 + 触发技能）`);

  const p1Reveals = state.reveals.get('p1')!;
  const qCount = p1Reveals.quality.size;
  const sCount = p1Reveals.silhouette.size;
  details.push(`p1（诸葛亮）quality 揭示数: ${qCount}（应为 2）`);
  details.push(`p1（诸葛亮）silhouette 揭示数: ${sCount}（应为 0）`);

  return {
    name: 'M4-A. 诸葛亮 R1 揭 2 品质',
    description: 'R1 未成交 → 触发 after-bid → 诸葛亮揭 2 件 quality',
    passed: isContinue && qCount === 2 && sCount === 0,
    details,
  };
}

// ===== M4-B: 曹操 R1 出价后揭 2 件轮廓 =====
function scenarioB(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  const r1 = submitRoundBids(state, bidsOf({ p1: 100, p2: 90, p3: 80, p4: 70 }));
  state = r1.state;

  const p2Reveals = state.reveals.get('p2')!;
  const qCount = p2Reveals.quality.size;
  const sCount = p2Reveals.silhouette.size;
  details.push(`p2（曹操）quality 揭示数: ${qCount}（应为 0）`);
  details.push(`p2（曹操）silhouette 揭示数: ${sCount}（应为 2）`);

  return {
    name: 'M4-B. 曹操 R1 揭 2 轮廓',
    description: 'R1 未成交 → 触发 after-bid → 曹操揭 2 件 silhouette',
    passed: qCount === 0 && sCount === 2,
    details,
  };
}

// ===== M4-C: 司马懿 R4 全揭示 =====
function scenarioC(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // R1~R3 都不达阈值，进入 R4 时触发司马懿 round-start
  const plan: [number, Record<string, number>][] = [
    [1, { p1: 100, p2: 90, p3: 80, p4: 70 }],
    [2, { p1: 200, p2: 180, p3: 160, p4: 140 }],
    [3, { p1: 300, p2: 280, p3: 260, p4: 240 }],
  ];

  for (const [r, spec] of plan) {
    const res = submitRoundBids(state, bidsOf(spec));
    state = res.state;
    const reveals = state.reveals.get('p3')!;
    details.push(`R${r} 后 司马懿 q=${reveals.quality.size} s=${reveals.silhouette.size}`);
  }

  // 进入 R4 之前已触发过 round-start（在 submitRoundBids R3 末尾）
  const p3 = state.reveals.get('p3')!;
  const totalItems = warehouse.items.length;
  details.push(`R3 末（即将 R4）司马懿 q=${p3.quality.size}/${totalItems}, s=${p3.silhouette.size}/${totalItems}（应均=${totalItems}）`);

  return {
    name: 'M4-C. 司马懿 R4 全揭示',
    description: 'R3 未成交 → 进入 R4 时触发司马懿 round-start → 揭全部',
    passed: p3.quality.size === totalItems && p3.silhouette.size === totalItems,
    details,
  };
}

// ===== M4-D: 信息隔离 =====
function scenarioD(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  const r1 = submitRoundBids(state, bidsOf({ p1: 100, p2: 90, p3: 80, p4: 70 }), fixedRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));
  state = r1.state;

  // p1 vs p4 都是诸葛亮 → 应揭不同的 2 件（独立 reveals）
  const p1Q = Array.from(state.reveals.get('p1')!.quality);
  const p4Q = Array.from(state.reveals.get('p4')!.quality);
  details.push(`p1（诸葛亮）已揭品质 itemIds: [${p1Q.join(',')}]`);
  details.push(`p4（诸葛亮影武者）已揭品质 itemIds: [${p4Q.join(',')}]`);

  // 各自独立的 RevealedSet（即不同 Set 实例，集合大小都是 2）
  const isolation = state.reveals.get('p1')! !== state.reveals.get('p4')!;
  details.push(`p1.reveals !== p4.reveals (不同 Set 实例): ${isolation}`);

  // 曹操（p2）的 silhouette 不应进入 p1 的 silhouette
  const p2S = state.reveals.get('p2')!.silhouette;
  const p1S = state.reveals.get('p1')!.silhouette;
  details.push(`p2 silhouette size=${p2S.size}, p1 silhouette size=${p1S.size}（p1 应为 0）`);

  return {
    name: 'M4-D. 信息隔离',
    description: '不同玩家的 RevealedSet 完全独立',
    passed: isolation && p1S.size === 0 && p2S.size === 2 && p1Q.length === 2 && p4Q.length === 2,
    details,
  };
}

// ===== M4-E: 拍卖成交后技能不再触发 =====
function scenarioE(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  // R1 一击成交 → after-bid 不应触发
  const r1 = submitRoundBids(state, bidsOf({ p1: 1000, p2: 100, p3: 50, p4: 'pass' }));
  state = r1.state;
  details.push(`R1 isClosed=${r1.isClosed}（应为 true）`);

  const p1 = state.reveals.get('p1')!;
  const p2 = state.reveals.get('p2')!;
  details.push(`成交后 p1 q=${p1.quality.size} s=${p1.silhouette.size}（应均为 0）`);
  details.push(`成交后 p2 q=${p2.quality.size} s=${p2.silhouette.size}（应均为 0）`);

  return {
    name: 'M4-E. 成交后技能不触发',
    description: 'R1 直接成交 → 不应触发任何 after-bid 技能',
    passed: r1.isClosed && p1.quality.size === 0 && p1.silhouette.size === 0 && p2.silhouette.size === 0,
    details,
  };
}

// ===== M4-F: 多轮累积揭示（诸葛亮 R1+R2+R3 = 6 件品质） =====
function scenarioF(): SkillScenarioResult {
  const details: string[] = [];
  const warehouse = generateWarehouse({ seed: 42 });
  const players = makePlayers();
  let state = createAuction(warehouse, players, { entryFee: 100 });

  for (let r = 1; r <= 3; r++) {
    const amount = r * 100;
    const res = submitRoundBids(state, bidsOf({
      p1: amount, p2: amount - 10, p3: amount - 20, p4: amount - 30,
    }));
    state = res.state;
  }

  const p1 = state.reveals.get('p1')!;
  const p2 = state.reveals.get('p2')!;
  details.push(`3 轮后 诸葛亮 quality=${p1.quality.size}（应为 6 = 2×3 轮）`);
  details.push(`3 轮后 曹操 silhouette=${p2.silhouette.size}（应为 6）`);

  // 司马懿 (round-start R4) 不应触发因为 R4 还没开始
  // 但 R3 末尾我们 advanceRound → triggerRoundStartSkills(R=4) 已经触发
  const p3 = state.reveals.get('p3')!;
  const totalItems = warehouse.items.length;
  details.push(`3 轮后 司马懿 q=${p3.quality.size}/${totalItems} s=${p3.silhouette.size}/${totalItems}（R3 末进入 R4 时触发，应=全数）`);

  return {
    name: 'M4-F. 多轮累积',
    description: '3 轮 after-bid 后，诸葛亮揭 6 品质 / 曹操揭 6 轮廓 / 司马懿全揭示（R3 末进入 R4 时）',
    passed: p1.quality.size === 6 && p2.silhouette.size === 6 && p3.quality.size === totalItems,
    details,
  };
}

export function runAllSkillScenarios(): SkillScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD(), scenarioE(), scenarioF()];
}

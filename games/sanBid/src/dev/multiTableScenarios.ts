// M8 多桌模拟场景验证

import { GENERALS } from '../data/characters.ts';
import {
  simulateTableHand, simulateOtherTables, simulateOtherTablesEndToEnd,
  type SimulatedTable,
} from '../core/tableSim.ts';
import { createTournament, runTournament } from '../core/tournament.ts';
import type { Player } from '../core/types.ts';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeTable(id: string, seed: number): SimulatedTable {
  const personalities = ['conservative', 'aggressive', 'bluffer', 'conservative'] as const;
  const generals = [GENERALS.zhugeliang, GENERALS.caocao, GENERALS.simayi, GENERALS.zhugeliang];
  return {
    id,
    players: Array.from({ length: 4 }, (_, i) => ({
      id: `${id}-p${i + 1}`,
      name: `${id}-${personalities[i].slice(0, 1).toUpperCase()}`,
      isHuman: false,
      general: generals[i],
      chips: 1000,
      personality: personalities[i],
    } as Player)),
  };
}

export interface MultiTableScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  details: string[];
}

// ===== M8-A: 单桌单手模拟 =====
function scenarioA(): MultiTableScenarioResult {
  const details: string[] = [];
  const rng = lcg(1);
  const t = makeTable('T1', 1);
  const r = simulateTableHand(t.players, 100, { rng });

  const totalChips = Array.from(r.newChips.values()).reduce((a, b) => a + b, 0);
  details.push(`仓库 V=${r.warehouseValue}, 成交价 P=${r.closedPrice}, winner=${r.winnerId}, voided=${r.voided}`);
  details.push(`各玩家筹码: ${Array.from(r.newChips.entries()).map(([id, c]) => `${id}=${c}`).join(', ')}`);
  details.push(`总筹码 ${totalChips}（开局 4×1000=4000）`);

  // 不变量：总筹码 = 4000 - 入场费总数 - P + V (中标者) = 4000 - 400 + (V - P)
  // 流拍时: 4000 - 400 = 3600
  const expected = r.voided ? 3600 : 3600 + r.warehouseValue - r.closedPrice;
  details.push(`期望总筹码 = ${expected}`);

  return {
    name: 'M8-A. 单桌单手',
    description: '4 玩家入场 → 抽样仓库价值 → 决胜中标 → 总筹码守恒',
    passed: totalChips === expected,
    details,
  };
}

// ===== M8-B: 多桌一手 =====
function scenarioB(): MultiTableScenarioResult {
  const details: string[] = [];
  const rng = lcg(42);
  const tables = [makeTable('T1', 1), makeTable('T2', 2), makeTable('T3', 3)];
  const snap = simulateOtherTables(tables, 100, rng);

  details.push(`3 桌 × 4 人 = 12 玩家入场`);
  details.push(`总活人 ${snap.totalAlive}, 总筹码 ${snap.totalChips}, 平均 ${snap.avgChipsAlive}`);
  details.push(`各桌结果：`);
  for (const r of snap.perTableResults) {
    details.push(`  ${r.tableId}: V=${r.result.warehouseValue} P=${r.result.closedPrice} w=${r.result.winnerId} voided=${r.result.voided}`);
  }

  return {
    name: 'M8-B. 多桌一手',
    description: '3 张桌同时跑一手模拟，输出汇总',
    passed: snap.totalAlive >= 1 && snap.perTableResults.length === 3,
    details,
  };
}

// ===== M8-C: 多桌跑到终局 =====
function scenarioC(): MultiTableScenarioResult {
  const details: string[] = [];
  const rng = lcg(99);
  const tables = [makeTable('T1', 1), makeTable('T2', 2), makeTable('T3', 3), makeTable('T4', 4)];
  const result = simulateOtherTablesEndToEnd(tables, { rng, handsPerBlindLevel: 3, maxHands: 50 });

  details.push(`总手数 ${result.hands.length}, 末时存活 ${result.totalSurvivors}`);
  details.push(`各桌存活：${result.finalAliveByTable.map((x) => `${x.tableId}=${x.alivePlayers}`).join(', ')}`);
  if (result.hands.length > 0) {
    const first = result.hands[0];
    const last = result.hands[result.hands.length - 1];
    details.push(`首手 (h=${first.hand}, blind=${first.blind}): 总活=${first.snapshot.totalAlive}, 平均=${first.snapshot.avgChipsAlive}`);
    details.push(`末手 (h=${last.hand}, blind=${last.blind}): 总活=${last.snapshot.totalAlive}, 平均=${last.snapshot.avgChipsAlive}`);
  }

  // 由于盲注不断递增，最终大多数玩家应被淘汰
  const initial = 16;
  return {
    name: 'M8-C. 多桌跑完赛事',
    description: '4 桌 × 4 人 跑完 → 大多数被淘汰',
    passed: result.totalSurvivors < initial && result.totalSurvivors > 0,
    details,
  };
}

// ===== M8-D: MTT 联合 — 玩家所在桌真实跑 + 3 张其它桌模拟 =====
function scenarioD(): MultiTableScenarioResult {
  const details: string[] = [];
  const rng = lcg(7);

  // 玩家所在桌：4 玩家 + 真实 MTT
  const myTable: Player[] = [
    { id: 'me', name: '我', isHuman: true, general: GENERALS.zhugeliang, chips: 0, personality: 'conservative' },
    { id: 'm-ai1', name: '曹操(同桌)', isHuman: false, general: GENERALS.caocao, chips: 0, personality: 'aggressive' },
    { id: 'm-ai2', name: '司马懿(同桌)', isHuman: false, general: GENERALS.simayi, chips: 0, personality: 'bluffer' },
    { id: 'm-ai3', name: '吕布(同桌)', isHuman: false, general: GENERALS.zhugeliang, chips: 0, personality: 'aggressive' },
  ];
  const myT = createTournament(myTable);
  const myResult = runTournament(myT, { rng, secPerHand: 300, maxHands: 30, rebuyPolicy: 'never' });

  details.push(`【我所在桌】跑了 ${myResult.hands.length} 手，名次：${myResult.ranking.map((id) => myResult.finalState.players.find((p) => p.id === id)?.name).join(' → ')}`);

  // 其它 3 张桌模拟
  const otherTables = [makeTable('T2', 2), makeTable('T3', 3), makeTable('T4', 4)];
  const otherResult = simulateOtherTablesEndToEnd(otherTables, { rng, handsPerBlindLevel: 3, maxHands: myResult.hands.length });

  details.push(`【其它 3 桌】模拟 ${otherResult.hands.length} 手，末时存活 ${otherResult.totalSurvivors}`);
  details.push(`场上汇总：玩家桌冠军 = ${myResult.ranking[0]}, 其它桌存活 ${otherResult.totalSurvivors} 人`);

  return {
    name: 'M8-D. 玩家桌+模拟桌联合',
    description: '玩家所在桌真实跑 MTT；其它桌蒙特卡洛模拟，赛事联合统计',
    passed: myResult.ranking.length === 4 && otherResult.totalSurvivors >= 0,
    details,
  };
}

export function runAllMultiTableScenarios(): MultiTableScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD()];
}

// M7 MTT 单桌场景验证

import { GENERALS } from '../data/characters.ts';
import {
  advanceTime, createTournament, playHand, runTournament,
  tryAddon, tryRebuy, _internal,
} from '../core/tournament.ts';
import type { Player } from '../core/types.ts';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function makeAiPlayers(): Player[] {
  return [
    { id: 'p1', name: '诸葛亮·保守', isHuman: false, general: GENERALS.zhugeliang, chips: 0, personality: 'conservative' },
    { id: 'p2', name: '曹操·激进',   isHuman: false, general: GENERALS.caocao,    chips: 0, personality: 'aggressive' },
    { id: 'p3', name: '司马懿·诈唬', isHuman: false, general: GENERALS.simayi,    chips: 0, personality: 'bluffer' },
    { id: 'p4', name: '诸葛亮·诈唬', isHuman: false, general: GENERALS.zhugeliang, chips: 0, personality: 'bluffer' },
  ];
}

export interface MttScenarioResult {
  name: string;
  description: string;
  passed: boolean;
  details: string[];
}

// ===== M7-A: 创建锦标赛 =====
function scenarioA(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  const t = createTournament(players);
  const allChips = t.players.every((p) => p.chips === 1000);
  details.push(`初始 chips：${t.players.map((p) => p.chips).join(',')}（应均=1000）`);
  details.push(`初始 blind = ${_internal.currentBlind(t)}（应=100）`);
  details.push(`elapsedSec = ${t.elapsedSec}, handsPlayed = ${t.handsPlayed}`);
  return {
    name: 'M7-A. 创建锦标赛',
    description: '4 玩家入场，各 1000 筹码 + 第 1 档盲注',
    passed: allChips && _internal.currentBlind(t) === 100 && t.handsPlayed === 0,
    details,
  };
}

// ===== M7-B: 跑一手 =====
function scenarioB(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  let t = createTournament(players);
  const rng = lcg(123);
  const r = playHand(t, rng);
  t = r.state;

  details.push(`Hand ${r.log.hand} 仓库总值 ${r.log.warehouseTotalValue}, 入场费 ${r.log.entryFee}`);
  details.push(`轮次数 ${r.log.rounds.length}, 成交 winner=${r.log.closed.winnerId}`);
  details.push(`各玩家 chips：${Object.entries(r.log.chipsAfter).map(([id, c]) => `${id}=${c}`).join(', ')}`);
  details.push(`新淘汰：[${r.log.eliminated.join(',')}]`);

  return {
    name: 'M7-B. 跑一手',
    description: '4 AI 跑 1 个仓库的拍卖，记录日志',
    passed: r.log.hand === 1 && r.log.rounds.length >= 1,
    details,
  };
}

// ===== M7-C: 盲注递增 =====
function scenarioC(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  let t = createTournament(players);
  details.push(`初始 blind = ${_internal.currentBlind(t)}`);

  // 推 60s（默认 60 秒/档），应进入第 2 档
  // 但 CONFIG.tournament.blindLevelDurationSec = 900；这里 advanceTime 用配置
  // 改用相对推进：推一整档时间
  const dur = 900; // CONFIG default
  t = advanceTime(t, dur);
  details.push(`+${dur}s 后 blind = ${_internal.currentBlind(t)}（应=150）`);

  t = advanceTime(t, dur * 8);
  details.push(`+8 档时间后 blind = ${_internal.currentBlind(t)}（应=2000，最末档）`);
  details.push(`isFinalLevel = ${_internal.isFinalLevel(t)}（应=true）`);

  return {
    name: 'M7-C. 盲注递增',
    description: '推进时间 → currentBlindIdx 抬升 → 最末档锁定',
    passed: _internal.currentBlind(t) === 2000 && _internal.isFinalLevel(t),
    details,
  };
}

// ===== M7-D: re-buy 与 add-on =====
function scenarioD(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  let t = createTournament(players);
  // 把 p1 chips 降到 100（< 200 阈值），p2 降到 0
  t = {
    ...t,
    players: t.players.map((p) => {
      if (p.id === 'p1') return { ...p, chips: 100 };
      if (p.id === 'p2') return { ...p, chips: 0 };
      return p;
    }),
  };
  // 平均活人筹码 = (100 + 1000 + 1000) / 3 = 700 (p2 死，不算)
  details.push(`重购前：p1=100, p2=0, p3=1000, p4=1000`);

  const r1 = tryRebuy(t, 'p1');
  if (r1.applied) t = r1.state;
  details.push(`p1 re-buy applied=${r1.applied} reason="${r1.reason ?? ''}" → p1.chips=${t.players.find((p) => p.id === 'p1')!.chips}`);

  // add-on for p2
  const r2 = tryAddon(t, 'p2');
  if (r2.applied) t = r2.state;
  details.push(`p2 add-on applied=${r2.applied} reason="${r2.reason ?? ''}" → p2.chips=${t.players.find((p) => p.id === 'p2')!.chips}`);

  // p3 高于阈值 → 不能 re-buy
  const r3 = tryRebuy(t, 'p3');
  details.push(`p3 re-buy applied=${r3.applied} reason="${r3.reason}"（应拒）`);

  // 末档禁购
  let tFinal = advanceTime(t, 900 * 9);
  // 把 p4 降到 0 测试
  tFinal = {
    ...tFinal,
    players: tFinal.players.map((p) => p.id === 'p4' ? { ...p, chips: 0 } : p),
  };
  const r4 = tryAddon(tFinal, 'p4');
  details.push(`末档 add-on applied=${r4.applied} reason="${r4.reason}"（应拒）`);

  const passed = r1.applied && r2.applied && !r3.applied && !r4.applied;
  return {
    name: 'M7-D. re-buy / add-on / 末档禁购',
    description: '低于阈值可 re-buy / 归零可 add-on / 末档禁购',
    passed,
    details,
  };
}

// ===== M7-E: 完整跑完锦标赛 =====
function scenarioE(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  const t = createTournament(players);
  const rng = lcg(99999);
  // 每手推进足够触发盲注递增（默认 900s/档，每手推 300s → 3 手一档）
  const result = runTournament(t, { rng, secPerHand: 300, maxHands: 60, rebuyPolicy: 'never' });

  details.push(`赛事结束：手数 ${result.hands.length}, 末轮盲注 idx=${result.finalState.currentBlindIdx}`);
  details.push(`名次（冠军→末位）：${result.ranking.map((id) => result.finalState.players.find((p) => p.id === id)?.name ?? id).join(' → ')}`);
  details.push(`最终筹码：${result.finalState.players.map((p) => `${p.name}=${p.chips}`).join(', ')}`);

  // 检测：恰好一名活人或 maxHands
  const aliveAtEnd = result.finalState.players.filter((p) => p.chips > 0).length;
  details.push(`末时活人数 = ${aliveAtEnd}（应 ≤ 1，因为 rebuyPolicy='never'）`);

  return {
    name: 'M7-E. 完整赛事跑完',
    description: '禁重购 + 4 AI 互卷 → 决出冠军',
    passed: result.hands.length >= 1 && aliveAtEnd <= 1 && result.ranking.length === 4,
    details,
  };
}

// ===== M7-F: 重购策略下能跑更久 =====
function scenarioF(): MttScenarioResult {
  const details: string[] = [];
  const players = makeAiPlayers();
  let t = createTournament(players);
  // 故意让 p4 开局 0 筹码，强制 aggressive 策略触发 add-on
  t = {
    ...t,
    players: t.players.map((p) => (p.id === 'p4' ? { ...p, chips: 0 } : p)),
  };
  details.push(`场景设置：p4 开局 0 筹码（被淘汰状态）→ aggressive 策略应在第 1 手前 add-on 救回`);

  const rng = lcg(42);
  const result = runTournament(t, { rng, secPerHand: 300, maxHands: 60, rebuyPolicy: 'aggressive' });

  const totalRebuys = Object.values(result.finalState.rebuys).reduce((a, b) => a + b, 0);
  const totalAddons = Object.values(result.finalState.addons).reduce((a, b) => a + b, 0);
  details.push(`手数 ${result.hands.length}, 末档 idx=${result.finalState.currentBlindIdx}`);
  details.push(`总 re-buy 次数 ${totalRebuys}, 总 add-on 次数 ${totalAddons}（应 ≥ 1）`);
  details.push(`名次：${result.ranking.map((id) => result.finalState.players.find((p) => p.id === id)?.name ?? id).join(' → ')}`);

  return {
    name: 'M7-F. 重购策略生效',
    description: 'aggressive 重购下，对 chips=0 的玩家自动 add-on（次数 ≥ 1）',
    passed: totalAddons >= 1 && result.ranking.length === 4,
    details,
  };
}

export function runAllMttScenarios(): MttScenarioResult[] {
  return [scenarioA(), scenarioB(), scenarioC(), scenarioD(), scenarioE(), scenarioF()];
}

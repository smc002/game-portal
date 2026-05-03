// MTT 锦标赛状态机 — M7
// 详见 DESIGN.md §5
//
// 单桌版（M7 范围）：
//   - 4 名玩家共桌
//   - 每"手"= 拍 1 个仓库（§3）
//   - 每 N 秒（demo 60s/档）盲注递增 → 入场费抬升
//   - re-buy: 筹码 < initialChips × 0.2 时可花 currentBlind 军资换平均筹码
//   - add-on: 筹码 = 0 时（被淘汰）可花 currentBlind 军资换平均筹码
//   - 末档盲注禁购
//   - 决出"最后一名筹码持有者"为冠军
//
// MTT 内部使用 chips 作为桌内货币；entry-fee 来源也是 chips
// 玩家"买入军资"概念在 demo 内简化：开局给 initialChips（已经换过的状态）

import { CONFIG } from '../config.ts';
import { decideAi } from './ai.ts';
import { createAuction, settle, submitRoundBids } from './auction.ts';
import { applyStakePayouts, settleStakes } from './betting.ts';
import { generateWarehouse } from './warehouse.ts';
import type { Bid, Player, Stake } from './types.ts';

// ---------- 状态 ----------
export interface TournamentState {
  players: Player[];           // 桌内全部玩家（含已被淘汰的，chips=0）
  currentBlindIdx: number;     // 0-based 索引 CONFIG.tournament.blindLevels
  elapsedSec: number;          // 累计耗时
  handsPlayed: number;         // 已拍卖仓库数
  rebuys: Record<string, number>;
  addons: Record<string, number>;
  /** 已淘汰玩家 id（按淘汰顺序）— 决定排名 */
  eliminationOrder: string[];
  /** 比赛结束时填入名次（玩家 id 数组，从冠军到最后一名） */
  finalRanking?: string[];
}

// ---------- 入口 ----------
export interface CreateTournamentOptions {
  initialChips?: number;
  /** 多少秒推进一档盲注（demo 默认 60，正式 900） */
  blindLevelDurationSec?: number;
}

export function createTournament(
  players: Player[],
  options: CreateTournamentOptions = {}
): TournamentState {
  const initialChips = options.initialChips ?? CONFIG.tournament.initialChips;
  const startedPlayers = players.map((p) => ({ ...p, chips: initialChips }));
  return {
    players: startedPlayers,
    currentBlindIdx: 0,
    elapsedSec: 0,
    handsPlayed: 0,
    rebuys: Object.fromEntries(players.map((p) => [p.id, 0])),
    addons: Object.fromEntries(players.map((p) => [p.id, 0])),
    eliminationOrder: [],
  };
}

// ---------- 工具 ----------
function currentBlind(state: TournamentState): number {
  return CONFIG.tournament.blindLevels[
    Math.min(state.currentBlindIdx, CONFIG.tournament.blindLevels.length - 1)
  ];
}

function isFinalLevel(state: TournamentState): boolean {
  return state.currentBlindIdx >= CONFIG.tournament.blindLevels.length - 1;
}

function aliveCount(state: TournamentState): number {
  return state.players.filter((p) => p.chips > 0).length;
}

function avgChipsAlive(state: TournamentState): number {
  const alive = state.players.filter((p) => p.chips > 0);
  if (alive.length === 0) return 0;
  return Math.round(alive.reduce((a, b) => a + b.chips, 0) / alive.length);
}

// ---------- 推进盲注（按经过时间） ----------
export function advanceTime(state: TournamentState, deltaSec: number): TournamentState {
  const dur = CONFIG.tournament.blindLevelDurationSec;
  const newElapsed = state.elapsedSec + deltaSec;
  const newIdx = Math.min(
    Math.floor(newElapsed / dur),
    CONFIG.tournament.blindLevels.length - 1
  );
  return { ...state, elapsedSec: newElapsed, currentBlindIdx: newIdx };
}

// ---------- 重购：re-buy ----------
export interface RebuyResult {
  state: TournamentState;
  applied: boolean;
  reason?: string;
}

export function tryRebuy(state: TournamentState, playerId: string): RebuyResult {
  if (isFinalLevel(state)) {
    return { state, applied: false, reason: '末档盲注禁止重购' };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { state, applied: false, reason: '玩家不存在' };
  const initialChips = CONFIG.tournament.initialChips;
  if (player.chips > initialChips * CONFIG.tournament.rebuyThresholdRatio) {
    return { state, applied: false, reason: 'chips 高于阈值，不能 re-buy' };
  }
  if (player.chips === 0) {
    return { state, applied: false, reason: '筹码归零，需 add-on（不是 re-buy）' };
  }
  // 应用：付当前盲注（视为外部"军资"，demo 内不追踪），获得当前平均筹码
  const grant = avgChipsAlive(state);
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, chips: p.chips + grant } : p
  );
  return {
    state: {
      ...state,
      players: newPlayers,
      rebuys: { ...state.rebuys, [playerId]: (state.rebuys[playerId] ?? 0) + 1 },
    },
    applied: true,
  };
}

// ---------- 重购：add-on（淘汰后） ----------
export function tryAddon(state: TournamentState, playerId: string): RebuyResult {
  if (isFinalLevel(state)) {
    return { state, applied: false, reason: '末档盲注禁止重购' };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { state, applied: false, reason: '玩家不存在' };
  if (player.chips !== 0) {
    return { state, applied: false, reason: '玩家未被淘汰（chips > 0）' };
  }
  const grant = avgChipsAlive(state);
  if (grant === 0) {
    return { state, applied: false, reason: '场上无活人' };
  }
  // 把玩家从 eliminationOrder 中拿出（重生）
  const newElim = state.eliminationOrder.filter((id) => id !== playerId);
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, chips: grant } : p
  );
  return {
    state: {
      ...state,
      players: newPlayers,
      eliminationOrder: newElim,
      addons: { ...state.addons, [playerId]: (state.addons[playerId] ?? 0) + 1 },
    },
    applied: true,
  };
}

// ---------- 跑一手（拍 1 个仓库） ----------
export interface PlayHandResult {
  state: TournamentState;
  /** 本手日志 */
  log: HandLogEntry;
}

export interface HandLogEntry {
  hand: number;
  warehouseTotalValue: number;
  entryFee: number;
  rounds: { round: number; bidsByPlayer: Record<string, string>; outcome: string }[];
  closed: { winnerId: string | null; price: number; closingRound: number };
  chipsAfter: Record<string, number>;
  eliminated: string[];
}

export function playHand(state: TournamentState, rng: () => number): PlayHandResult {
  const handNum = state.handsPlayed + 1;
  const blind = currentBlind(state);

  // 只拉活着的玩家入桌
  const alive = state.players.filter((p) => p.chips > 0);
  if (alive.length < 2) {
    throw new Error('playHand: 活人少于 2，赛事应已结束');
  }

  const warehouse = generateWarehouse({ seed: Math.floor(rng() * 1e9) });

  // 入桌玩家（注意：createAuction 会扣入场费）
  let auctionState = createAuction(warehouse, alive, { entryFee: blind }, rng);

  const log: HandLogEntry = {
    hand: handNum,
    warehouseTotalValue: warehouse.totalValue,
    entryFee: blind,
    rounds: [],
    closed: { winnerId: null, price: 0, closingRound: 0 },
    chipsAfter: {},
    eliminated: [],
  };

  // 跑拍卖直到结束
  let safety = 10;
  while (!auctionState.closed && safety-- > 0) {
    const round = auctionState.rounds.length + 1;
    const bids = new Map<string, Bid>();
    const stakes = new Map<string, Stake | null>();
    for (const p of auctionState.players) {
      // 全员 AI 决策（M7 demo：人类玩家也按 AI 行为，UI 后续再接）
      // 给 AI 兜底性格
      const playerWithPersonality: Player = {
        ...p,
        personality: p.personality ?? 'conservative',
      };
      const d = decideAi(auctionState, playerWithPersonality, { rng });
      bids.set(p.id, d.bid);
      stakes.set(p.id, d.stake);
    }
    const bidsRecord: Record<string, string> = {};
    for (const p of auctionState.players) {
      const b = bids.get(p.id)!;
      bidsRecord[p.id] = b.kind === 'bid' ? String(b.amount) : 'pass';
    }
    const res = submitRoundBids(auctionState, bids, rng, stakes);
    auctionState = res.state;
    log.rounds.push({
      round,
      bidsByPlayer: bidsRecord,
      outcome: res.isClosed
        ? `closed: w=${auctionState.closed!.winnerId} @${auctionState.closed!.price}`
        : 'continue',
    });
  }

  log.closed = auctionState.closed!;

  // 主结算（中标支付 + sellback）+ 押注结算
  const main = settle(auctionState);
  const stakeSettle = settleStakes(auctionState);
  const finalAuctionPlayers = applyStakePayouts(main.players, stakeSettle);

  // 把 finalAuctionPlayers 的 chips 写回 state.players
  const updatedPlayers = state.players.map((p) => {
    const after = finalAuctionPlayers.find((x) => x.id === p.id);
    if (after) {
      log.chipsAfter[p.id] = after.chips;
      return { ...p, chips: after.chips };
    }
    log.chipsAfter[p.id] = p.chips;
    return { ...p };
  });

  // 检测新淘汰
  const newlyDead: string[] = [];
  for (const p of updatedPlayers) {
    if (p.chips === 0 && !state.eliminationOrder.includes(p.id)) {
      newlyDead.push(p.id);
    }
  }
  log.eliminated = newlyDead;

  return {
    state: {
      ...state,
      players: updatedPlayers,
      handsPlayed: handNum,
      eliminationOrder: [...state.eliminationOrder, ...newlyDead],
    },
    log,
  };
}

// ---------- 跑完整锦标赛（demo 全 AI） ----------
export interface RunTournamentOptions {
  rng?: () => number;
  /** 每一手之间推进的 sec（用来触发盲注递增）*/
  secPerHand?: number;
  /** 安全阈值，防止死循环（默认 100 手） */
  maxHands?: number;
  /** 重购策略：'aggressive' 一旦低于阈值即重买；'never' 不重买 */
  rebuyPolicy?: 'aggressive' | 'never';
}

export interface TournamentRunResult {
  finalState: TournamentState;
  hands: HandLogEntry[];
  ranking: string[]; // 冠军 → 最后一名
}

export function runTournament(
  initial: TournamentState,
  options: RunTournamentOptions = {}
): TournamentRunResult {
  const rng = options.rng ?? Math.random;
  const secPerHand = options.secPerHand ?? 30;
  const maxHands = options.maxHands ?? 100;
  const rebuyPolicy = options.rebuyPolicy ?? 'aggressive';

  let state = initial;
  const hands: HandLogEntry[] = [];

  while (aliveCount(state) >= 2 && state.handsPlayed < maxHands) {
    // 重购阶段（开手前）
    if (rebuyPolicy === 'aggressive') {
      for (const p of state.players) {
        if (p.chips === 0) {
          const r = tryAddon(state, p.id);
          if (r.applied) state = r.state;
        } else {
          const r = tryRebuy(state, p.id);
          if (r.applied) state = r.state;
        }
      }
    }

    // 跑一手
    const result = playHand(state, rng);
    state = result.state;
    hands.push(result.log);

    // 推进时间（推进盲注档位）
    state = advanceTime(state, secPerHand);
  }

  // 决名次：最后剩下的活人 + 倒序的 eliminationOrder
  const stillAlive = state.players
    .filter((p) => p.chips > 0)
    .sort((a, b) => b.chips - a.chips)
    .map((p) => p.id);
  const ranking = [...stillAlive, ...state.eliminationOrder.slice().reverse()];

  return {
    finalState: { ...state, finalRanking: ranking },
    hands,
    ranking,
  };
}

export const _internal = {
  currentBlind,
  isFinalLevel,
  aliveCount,
  avgChipsAlive,
};

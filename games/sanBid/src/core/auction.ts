// 单仓拍卖核心 — M3
// 详见 DESIGN.md §3.3~§3.7
//
// 状态机：
//   createAuction(warehouse, players, entryFee)
//     ↓ (扣入场费，每位玩家 chips -= entryFee)
//   submitRoundBids(state, bidsByPlayerId)
//     ↓ (内部决定是否成交)
//   ┌────────── 已成交（state.closed 设值，可调 settle()）
//   └────────── 未成交（currentRound++，等下一轮 submitRoundBids）
//
// 核心规则：
//   - 第 R 轮：1st >= 2nd × thresholdMultipliers[R-1] 即成交（R=1..5）
//   - 末轮 (R=5)：阈值=1.0，严格高于 2nd 即成交；并列 1st 按 finalRoundTieRule 处理
//   - 任何一轮全员 pass / bid=0 → 流拍（allPassRule='voided'）
//   - 入场费沉没：从玩家筹码扣除后，不进入任何奖池
//
// 所有"随机"通过传入的 rng 函数完成（可测试）

import { CONFIG } from '../config.ts';
import { deductStakes, validateStake } from './betting.ts';
import { triggerAfterBidSkills, triggerRoundStartSkills } from './skills.ts';
import type {
  AuctionState,
  Bid,
  Player,
  PublicInfo,
  PublicInfoKind,
  Rarity,
  RevealedSet,
  RoundState,
  Stake,
  Warehouse,
} from './types.ts';

const RARITIES: Rarity[] = ['white', 'green', 'blue', 'purple', 'gold', 'red'];
const RAR_NAME: Record<Rarity, string> = {
  white: '普通', green: '优良', blue: '稀有',
  purple: '史诗', gold: '传说', red: '神话',
};
const CAT_NAME: Record<string, string> = {
  weapon: '兵器', book: '典籍', treasure: '异宝',
  horse: '战马', ritual: '礼器', stationery: '文房',
};

// ---------- 公共信息生成器 ----------
/** 排除红：神话级数量过于影响估值；不公开。*/
const PUBLIC_INFO_RARITIES: Rarity[] = ['white', 'green', 'blue', 'purple', 'gold'];

/**
 * 每轮开始时生成一条公共信息。
 * 所有玩家可见；'reveal-item' 类型还会把对应 itemId 加入 state.publicReveals。
 *
 * 设计原则：
 *   - 不直接泄露红色藏品数量
 *   - 一次只揭单档稀有度（不公开整张分布表）
 *   - 4 类信息随机轮换
 *   - **不重复**：同档稀有度（无论 avg/count）只揭一次，total-area 只揭一次，
 *     reveal-item 不重复揭同件藏品
 */
export function generatePublicInfo(
  state: AuctionState,
  round: number,
  rng: () => number
): PublicInfo {
  // 已用过的"信号槽" — 用于去重
  const usedRarities = new Set<Rarity>();
  let totalAreaUsed = false;
  for (const info of state.publicInfo) {
    if (info.rarity) usedRarities.add(info.rarity);
    if (info.kind === 'total-area') totalAreaUsed = true;
  }
  // reveal-item 的去重通过 state.publicReveals 实现

  // 候选池
  const unrevealedItems = state.warehouse.items.filter(
    (it) => !state.publicReveals.has(it.id)
  );
  const availableRarities = PUBLIC_INFO_RARITIES.filter(
    (r) =>
      !usedRarities.has(r) &&
      state.warehouse.items.some((it) => it.rarity === r)
  );

  const choices: PublicInfoKind[] = [];
  if (unrevealedItems.length > 0) choices.push('reveal-item');
  if (availableRarities.length > 0) {
    choices.push('rarity-avg');
    choices.push('rarity-count');
  }
  if (!totalAreaUsed) choices.push('total-area');

  // 兜底：所有信号都用过（极少见，5 轮内一般不会发生）
  if (choices.length === 0) {
    return {
      round,
      kind: 'total-area',
      text: `公共信息：本轮无新情报（前几轮已揭示主要信号）`,
    };
  }

  const k = choices[Math.floor(rng() * choices.length)];

  switch (k) {
    case 'reveal-item': {
      const pick = unrevealedItems[Math.floor(rng() * unrevealedItems.length)];
      return {
        round,
        kind: 'reveal-item',
        text: `公共揭示：「${pick.name}」（${CAT_NAME[pick.cat]} ・ ${RAR_NAME[pick.rarity]} ・ ${pick.shape.w}×${pick.shape.h}）位于第 ${pick.pos.row} 行第 ${pick.pos.col} 列，价值 ${pick.value} 筹码`,
        itemId: pick.id,
      };
    }
    case 'rarity-avg': {
      const r = availableRarities[Math.floor(rng() * availableRarities.length)];
      const items = state.warehouse.items.filter((it) => it.rarity === r);
      const avg = Math.round(items.reduce((s, it) => s + it.value, 0) / items.length);
      return {
        round,
        kind: 'rarity-avg',
        text: `公共信息：本仓【${RAR_NAME[r]}】藏品共 ${items.length} 件，平均价值 ${avg} 筹码`,
        rarity: r,
      };
    }
    case 'rarity-count': {
      const r = availableRarities[Math.floor(rng() * availableRarities.length)];
      const count = state.warehouse.items.filter((it) => it.rarity === r).length;
      return {
        round,
        kind: 'rarity-count',
        text: `公共信息：本仓【${RAR_NAME[r]}】藏品共 ${count} 件`,
        rarity: r,
      };
    }
    case 'total-area':
      return generateTotalArea(state, round);
  }
  return generateTotalArea(state, round);
}

function generateTotalArea(state: AuctionState, round: number): PublicInfo {
  const area = state.warehouse.items.reduce((s, it) => s + it.shape.w * it.shape.h, 0);
  const ratio = (area / (state.warehouse.cols * state.warehouse.rows) * 100).toFixed(1);
  return {
    round,
    kind: 'total-area',
    text: `公共信息：藏品总占地 ${area} / ${state.warehouse.cols * state.warehouse.rows} 格（装载率 ${ratio}%）`,
  };
}

function emitPublicInfo(state: AuctionState, round: number, rng: () => number): void {
  const info = generatePublicInfo(state, round, rng);
  state.publicInfo.push(info);
  if (info.kind === 'reveal-item' && info.itemId) {
    state.publicReveals.add(info.itemId);
  }
}

// ---------- 创建 ----------
export interface CreateAuctionOptions {
  /** 入场费（筹码），默认 CONFIG.tournament.blindLevels[0] */
  entryFee?: number;
}

export function createAuction(
  warehouse: Warehouse,
  players: Player[],
  options: CreateAuctionOptions = {},
  rng: () => number = Math.random
): AuctionState {
  const entryFee = options.entryFee ?? CONFIG.tournament.blindLevels[0];

  // 扣入场费（沉没）
  const updatedPlayers: Player[] = players.map((p) => ({
    ...p,
    chips: Math.max(0, p.chips - entryFee),
  }));

  // 初始化每位玩家的揭示集（开局空）
  const reveals = new Map<string, RevealedSet>();
  for (const p of players) {
    reveals.set(p.id, { quality: new Set(), silhouette: new Set() });
  }

  const state: AuctionState = {
    warehouse,
    players: updatedPlayers,
    rounds: [],
    reveals,
    publicReveals: new Set(),
    publicInfo: [],
    entryFee,
  };

  // 触发 R1 的 round-start 技能（如果有武将 triggerRound=1）
  triggerRoundStartSkills(state, 1, rng);
  // 生成 R1 的公共信息
  emitPublicInfo(state, 1, rng);

  return state;
}

// ---------- 单轮提交 ----------
export interface SubmitResult {
  state: AuctionState;
  /** true 表示本轮过后已经成交或流拍（state.closed 已被设值）*/
  isClosed: boolean;
}

/**
 * 处理一轮报价：
 *   1. 校验/扣除押注（如果传入 stakes）
 *   2. 把 bids + stakes 记录到 state.rounds 末尾
 *   3. 计算 1st、2nd
 *   4. 判定是否成交 / 流拍 / 进入下一轮
 *
 * 所需的 rng 仅在末轮并列裁决时使用。
 *
 * @param stakes 可选：playerId -> Stake | null。为 null 表示不押注。
 *               押注金会立即从玩家筹码中扣除（提交即扣）。
 */
export function submitRoundBids(
  state: AuctionState,
  bids: Map<string, Bid>,
  rng: () => number = Math.random,
  stakes?: Map<string, Stake | null>
): SubmitResult {
  if (state.closed) {
    throw new Error('submitRoundBids: 拍卖已结束');
  }
  const round = state.rounds.length + 1;
  if (round > CONFIG.auction.maxRounds) {
    throw new Error(`submitRoundBids: 已超过最大轮次 ${CONFIG.auction.maxRounds}`);
  }

  // 校验每个玩家都有报价（缺失视为 pass）
  const filled = new Map<string, Bid>();
  for (const p of state.players) {
    filled.set(p.id, bids.get(p.id) ?? { kind: 'pass' });
  }

  // 校验押注（若提供）
  const filledStakes = new Map<string, Stake | null>();
  if (stakes) {
    for (const p of state.players) {
      const s = stakes.get(p.id) ?? null;
      if (s) {
        const bid = filled.get(p.id)!;
        const bidAmount = bid.kind === 'bid' ? bid.amount : 0;
        const v = validateStake(p, s, bidAmount);
        if (!v.ok) {
          throw new Error(
            `submitRoundBids: player ${p.id} 押注非法 — ${v.reason}`
          );
        }
      }
      filledStakes.set(p.id, s);
    }
  }

  // 押注金立即扣除
  const updatedPlayers = stakes ? deductStakes(state.players, filledStakes) : state.players;

  const newRound: RoundState = {
    round,
    bids: filled,
    stakes: filledStakes,
  };
  const rounds = [...state.rounds, newRound];

  // 转换为 (id, amount) 列表，pass = 0
  const entries = Array.from(filled.entries()).map(([id, b]) => ({
    id,
    amount: b.kind === 'bid' ? b.amount : 0,
  }));
  // 按金额降序
  entries.sort((a, b) => b.amount - a.amount);

  const first = entries[0];
  const second = entries[1] ?? { id: '', amount: 0 };

  // ---------- 判定 ----------

  // 全员报 0
  if (first.amount === 0 && CONFIG.auction.allPassRule === 'voided') {
    return {
      state: {
        ...state,
        players: updatedPlayers,
        rounds,
        closed: { winnerId: null, price: 0, closingRound: round },
      },
      isClosed: true,
    };
  }

  const isFinalRound = round === CONFIG.auction.maxRounds;
  const threshold = CONFIG.auction.thresholdMultipliers[round - 1];
  // threshold check: 1st >= 2nd * threshold
  // 注意：second.amount 可能为 0，避免除 0
  const meetsThreshold =
    second.amount === 0
      ? first.amount > 0 // 全场只有 1st 出价 → 必成交
      : first.amount >= second.amount * threshold;

  if (meetsThreshold) {
    // 处理并列：找出所有出价 == first.amount 的玩家
    const tied = entries.filter((e) => e.amount === first.amount);
    let winnerId = first.id;
    if (tied.length > 1) {
      if (isFinalRound) {
        // 末轮按 finalRoundTieRule（默认 random）
        if (CONFIG.auction.finalRoundTieRule === 'random') {
          winnerId = tied[Math.floor(rng() * tied.length)].id;
        } else if (CONFIG.auction.finalRoundTieRule === 'voided') {
          return {
            state: {
              ...state,
              rounds,
              closed: { winnerId: null, price: 0, closingRound: round },
            },
            isClosed: true,
          };
        }
        // 'overtime' 暂不实现（M3 范围外）
      } else {
        // 非末轮：1st = 2nd 必然 threshold 不足（除非 first==second 且 threshold=1.0）
        // 此分支理论上不会进，因为 1st == 2nd 时 1st >= 2nd × threshold 仅当 threshold <= 1.0
        // 即 R=5 才会出现；R<5 时不会触发"成交且并列"。但为安全起见，仍按随机处理。
        winnerId = tied[Math.floor(rng() * tied.length)].id;
      }
    }

    return {
      state: {
        ...state,
        players: updatedPlayers,
        rounds,
        closed: { winnerId, price: first.amount, closingRound: round },
      },
      isClosed: true,
    };
  }

  // 未成交
  if (isFinalRound) {
    // 末轮但阈值仍未达 → 按"末轮严格高于 2nd 即成交"逻辑兜底
    // 这种情况其实就是 first.amount > second.amount 但 first < second × 1.0+ε
    // 对于 threshold=1.0：first >= second×1.0 等价于 first >= second
    // 既然没进入 meetsThreshold 分支，意味着 first < second，理论上不存在
    // 安全起见再判一次：
    if (first.amount > second.amount) {
      // 严格高于
      return {
        state: {
          ...state,
          rounds,
          closed: { winnerId: first.id, price: first.amount, closingRound: round },
        },
        isClosed: true,
      };
    }
    // 实在还是没成交 → 流拍
    return {
      state: {
        ...state,
        players: updatedPlayers,
        rounds,
        closed: { winnerId: null, price: 0, closingRound: round },
      },
      isClosed: true,
    };
  }

  // 进入下一轮 — 先触发本轮"出价后"技能，再触发下一轮"开局"技能 + 公共信息
  const nextState: AuctionState = { ...state, players: updatedPlayers, rounds };
  triggerAfterBidSkills(nextState, rng);
  triggerRoundStartSkills(nextState, round + 1, rng);
  emitPublicInfo(nextState, round + 1, rng);
  return {
    state: nextState,
    isClosed: false,
  };
}

// ---------- 结算 ----------
export interface SettleResult {
  /** 经过结算后玩家的最新筹码（含中标支付 + 仓库回收） */
  players: Player[];
  /** 中标者的净利润（仓库总值 - 中标价；流拍时 0） */
  winnerProfit: number;
  /** 仓库回收价值（中标者的"卖回"，流拍时 0） */
  sellbackValue: number;
}

/**
 * 应用拍卖结果到玩家筹码：
 *   - 中标者：chips -= price（已扣入场费）→ 然后获得仓库 → 场末按 sellbackRate 回收
 *   - 未中标者：仅入场费已沉（这里不再变动）
 *
 * 注意：在场（即一手）结算里，回收是"立即"的——
 *   因为 demo 的 MTT 中"一手 = 一仓"，所以场末 = 一手末 = 立即变现。
 */
export function settle(state: AuctionState): SettleResult {
  if (!state.closed) {
    throw new Error('settle: 拍卖尚未结束');
  }

  const { winnerId, price } = state.closed;
  const sellbackRate = CONFIG.auction.sellbackRate;
  let sellbackValue = 0;
  let winnerProfit = 0;

  const players = state.players.map((p) => {
    if (p.id !== winnerId) return { ...p };
    // 中标者扣报价金额，回收仓库总值 × sellbackRate
    sellbackValue = Math.round(state.warehouse.totalValue * sellbackRate);
    winnerProfit = sellbackValue - price;
    return { ...p, chips: p.chips - price + sellbackValue };
  });

  return { players, winnerProfit, sellbackValue };
}

// ---------- 工具：当前轮次 ----------
export function currentRound(state: AuctionState): number {
  return state.rounds.length + 1;
}

// AI 决策 — M6
// 详见 DESIGN.md §6.1 / §6.2
//
// 核心算法：
//   1. 估算本仓总值 = 已侦察藏品的精确估值 + 未侦察藏品的"先验期望"
//      - 已侦察品质：用对应稀有度档的中位价值
//      - 已侦察轮廓：用面积 → 期望价值映射（demo 简化为 area × 平均单格价）
//      - 双重已知：取两者交集（即按品质档）
//      - 完全未知：用全仓平均期望（30~60 件 × 各档期望均值）
//   2. 加上"性格偏移"+ 高斯噪声（轮次越后噪声越小）
//   3. 决定本轮报价：
//      - 保守派：贴自己估值 × (0.85~1.0)
//      - 激进派：第 1 轮博"一击成交" = 估值 × 2.0+；之后 = 估值 × (1.0~1.1)
//      - 诈唬派：前期报 估值 × (0.6~0.8) 误导；末轮报 估值 × (1.0~1.1)
//   4. 决定押注：依据自己当前估值与本轮报价的偏离程度，结合性格

import { CONFIG } from '../config.ts';
import type {
  AuctionState,
  Bid,
  Item,
  Personality,
  Player,
  Rarity,
  Stake,
  Warehouse,
} from './types.ts';

const RARITIES: Rarity[] = ['white', 'green', 'blue', 'purple', 'gold', 'red'];

// ---------- 估值器 ----------

/** 单档稀有度的中位价值 */
function rarityMedian(r: Rarity): number {
  const [lo, hi] = CONFIG.warehouse.rarities[r].valueRange;
  return (lo + hi) / 2;
}

/** 单格的"先验平均价值"（不知品质时用） */
function priorPerCellValue(): number {
  // 期望仓库总值（按 rarity countRange 中位数 × valueRange 中位数）
  let totalExpected = 0;
  let totalExpectedItems = 0;
  for (const r of RARITIES) {
    const cfg = CONFIG.warehouse.rarities[r];
    const cnt = (cfg.countRange[0] + cfg.countRange[1]) / 2;
    const val = (cfg.valueRange[0] + cfg.valueRange[1]) / 2;
    totalExpected += cnt * val;
    totalExpectedItems += cnt;
  }
  // 平均装载率 ~ 45%, 200 格 → ~90 占用格
  const avgOccupiedCells = 200 * 0.45;
  return totalExpected / avgOccupiedCells;
}

/** 单件藏品的平均期望价值（不知品质 + 不知轮廓） */
function priorPerItemValue(): number {
  let totalVal = 0;
  let totalCnt = 0;
  for (const r of RARITIES) {
    const cfg = CONFIG.warehouse.rarities[r];
    const cnt = (cfg.countRange[0] + cfg.countRange[1]) / 2;
    const val = (cfg.valueRange[0] + cfg.valueRange[1]) / 2;
    totalVal += cnt * val;
    totalCnt += cnt;
  }
  return totalVal / totalCnt;
}

/** 单件藏品的估值（基于已侦察信息） */
function estimateItemValue(
  item: Item,
  qualityKnown: boolean,
  silhouetteKnown: boolean,
  publiclyKnown: boolean = false
): number {
  // 公共完全揭示 → 精确价值
  if (publiclyKnown) return item.value;
  if (qualityKnown && silhouetteKnown) {
    // 双知 → 用品质中位数
    return rarityMedian(item.rarity);
  }
  if (qualityKnown) {
    // 只知品质 → 用品质中位数
    return rarityMedian(item.rarity);
  }
  if (silhouetteKnown) {
    // 只知轮廓 → 面积 × 单格平均
    return item.shape.w * item.shape.h * priorPerCellValue();
  }
  // 完全未知 → 全仓平均期望
  return priorPerItemValue();
}

/** AI 估值整个仓库 */
export interface EstimateOptions {
  noiseScale?: number; // 高斯噪声标准差占估值的比例
  rng?: () => number;
}

export function estimateWarehouseValue(
  state: AuctionState,
  player: Player,
  opts: EstimateOptions = {}
): number {
  const reveals = state.reveals.get(player.id);
  if (!reveals) {
    throw new Error(`estimateWarehouseValue: 未找到 player ${player.id} 的 reveals`);
  }
  const noiseScale = opts.noiseScale ?? 0.10;
  const rng = opts.rng ?? Math.random;

  let estimate = 0;
  for (const it of state.warehouse.items) {
    const q = reveals.quality.has(it.id);
    const s = reveals.silhouette.has(it.id);
    const pub = state.publicReveals.has(it.id);
    estimate += estimateItemValue(it, q, s, pub);
  }

  // 加高斯噪声（用 Box-Muller）
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const noisy = estimate * (1 + gauss * noiseScale);
  return Math.max(0, Math.round(noisy));
}

// ---------- 性格偏移 ----------
function personalityBias(p: Personality): number {
  switch (p) {
    case 'conservative': return -0.10; // 估低 10%
    case 'aggressive':   return +0.05; // 估高 5%
    case 'bluffer':      return 0;
  }
}

function personalityRiskFactor(p: Personality): number {
  // 风险系数：决定"心理上限"= 估值 × 风险
  switch (p) {
    case 'conservative': return 0.85; // 不愿出超估值
    case 'aggressive':   return 1.20; // 敢冒险
    case 'bluffer':      return 1.05;
  }
}

// ---------- 决策 ----------
export interface AiDecisionOptions {
  rng?: () => number;
}

/**
 * AI 在当前 AuctionState 下决定本轮的 Bid + Stake
 *
 * 注：调用前 state.players 中的 chips 已经反映"开局扣入场费 + 之前轮次扣押注"
 */
export function decideAi(
  state: AuctionState,
  player: Player,
  options: AiDecisionOptions = {}
): { bid: Bid; stake: Stake | null } {
  if (!player.personality) {
    throw new Error(`decideAi: player ${player.id} 没有 personality`);
  }
  const rng = options.rng ?? Math.random;
  const round = state.rounds.length + 1;
  const personality = player.personality;

  // 1. 估值 + 性格偏移 + 噪声（噪声随轮次递减）
  const noiseByRound = [0.20, 0.15, 0.12, 0.08, 0.05][round - 1] ?? 0.10;
  const rawEstimate = estimateWarehouseValue(state, player, { noiseScale: noiseByRound, rng });
  const biasedEstimate = Math.round(rawEstimate * (1 + personalityBias(personality)));

  // 2. 心理上限
  const psyMax = Math.round(biasedEstimate * personalityRiskFactor(personality));

  // 3. 决定报价
  const isFinalRound = round === CONFIG.auction.maxRounds;
  let bidAmount = 0;

  if (personality === 'conservative') {
    // 保守：报 估值 × (0.85~0.95)，永不超出心理上限
    const factor = 0.85 + rng() * 0.10;
    bidAmount = Math.min(psyMax, Math.round(biasedEstimate * factor));
  } else if (personality === 'aggressive') {
    if (round === 1) {
      // 第 1 轮博一击：估值 × (1.5~2.2)
      const factor = 1.5 + rng() * 0.7;
      bidAmount = Math.min(psyMax, Math.round(biasedEstimate * factor));
    } else {
      // 之后跟随心理上限
      const factor = 0.95 + rng() * 0.15;
      bidAmount = Math.min(psyMax, Math.round(biasedEstimate * factor));
    }
  } else {
    // bluffer
    if (isFinalRound) {
      // 末轮突袭：估值 × (1.0~1.1)
      const factor = 1.0 + rng() * 0.10;
      bidAmount = Math.min(psyMax, Math.round(biasedEstimate * factor));
    } else {
      // 前期诱导：估值 × (0.6~0.8)
      const factor = 0.6 + rng() * 0.20;
      bidAmount = Math.round(biasedEstimate * factor);
    }
  }

  // 不能超过自己持有筹码
  bidAmount = Math.min(bidAmount, player.chips);
  // 不能为负
  bidAmount = Math.max(0, bidAmount);

  const bid: Bid = bidAmount > 0 ? { kind: 'bid', amount: bidAmount } : { kind: 'pass' };

  // 4. 决定押注
  const stake = decideStake(player, biasedEstimate, bidAmount, round, rng, state.entryFee);

  return { bid, stake };
}

function decideStake(
  player: Player,
  estimate: number,
  bidAmount: number,
  round: number,
  rng: () => number,
  entryFee: number
): Stake | null {
  if (bidAmount === 0) return null;
  const personality = player.personality!;

  // 押注意愿 — 按性格 + 轮次 + 偏离度
  const deviation = Math.abs(bidAmount - estimate) / Math.max(estimate, 1);

  let willingness = 0;
  switch (personality) {
    case 'conservative':
      willingness = round >= 4 && deviation < 0.12 ? 0.4 : 0.05;
      break;
    case 'aggressive':
      willingness = round <= 2 ? 0.7 : 0.4;
      break;
    case 'bluffer':
      willingness = round >= 3 ? 0.5 : 0.15;
      break;
  }

  if (rng() > willingness) return null;

  // 押注金额固定 = entryFee × 5
  const stakeAmount = entryFee * 5;
  // 安全检查：不能超过 50% 筹码（否则 validateStake 会拒）
  const maxStake = Math.floor(player.chips * CONFIG.betting.maxStakeRatio);
  if (stakeAmount > maxStake || stakeAmount <= 0) return null;

  return { amount: stakeAmount, basisBid: bidAmount };
}

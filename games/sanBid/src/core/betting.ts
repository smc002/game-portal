// 押注玩法 — M5
// 详见 DESIGN.md §4
//
// 关键规则：
//   - 玩家每轮报价时，可选择额外下一笔押注
//   - 押的是"仓库真实总值落在 [本轮自己报价 ×0.9, 本轮自己报价 ×1.1] 区间内"
//   - 押注金当场扣除（即提交时立即扣筹码）
//   - 本仓成交后结算：
//       - 在成交那一轮的押注：按本轮报价 ±10% 判定
//         * 命中：押注金 × payoutMultipliers[R-1] 返还
//         * 未中：押注金没收
//       - 在未成交那几轮的押注：押注金原额退回（不胜不负）
//   - 流拍：所有押注按"未成交"处理 → 全部原额退回
//
// 押注金额上限：单次押注 ≤ 玩家当前筹码 × maxStakeRatio (默认 50%)

import { CONFIG } from '../config.ts';
import type { AuctionState, Player, Stake } from './types.ts';

// ---------- 校验：能否下注 ----------
export interface StakeValidation {
  ok: boolean;
  reason?: string;
}

export function validateStake(
  player: Player,
  stake: Stake,
  bidAmount: number
): StakeValidation {
  if (stake.amount <= 0) {
    return { ok: false, reason: '押注金额必须为正' };
  }
  const max = Math.floor(player.chips * CONFIG.betting.maxStakeRatio);
  if (stake.amount > max) {
    return {
      ok: false,
      reason: `押注金额 ${stake.amount} 超过上限 ${max}（当前筹码 × ${CONFIG.betting.maxStakeRatio}）`,
    };
  }
  if (bidAmount <= 0) {
    return { ok: false, reason: '本轮报价为 0（pass）时不能押注' };
  }
  if (stake.basisBid !== bidAmount) {
    return { ok: false, reason: 'stake.basisBid 必须等于本轮报价金额' };
  }
  return { ok: true };
}

/**
 * 把某玩家在某轮的押注记入 RoundState（同时返回扣除后的玩家筹码列表）。
 * 返回新的 players 数组（不变更原对象）。
 *
 * 本函数应在 submitRoundBids 之外调用（先扣押注，再提交报价），
 * 但为了简化 demo，allow caller 在同一时间点提交 bids+stakes。
 * 见 submitRoundBids 的 stakes 参数。
 */
export function deductStakes(
  players: Player[],
  stakesByPlayerId: Map<string, Stake | null>
): Player[] {
  return players.map((p) => {
    const s = stakesByPlayerId.get(p.id);
    if (!s) return { ...p };
    return { ...p, chips: p.chips - s.amount };
  });
}

// ---------- 结算 ----------
export interface StakeSettlementEntry {
  playerId: string;
  round: number;
  stake: Stake;
  /** 'win' = 命中按 multiplier 返还；'refund' = 未成交那轮原额退回；'lose' = 命中那轮但偏离 →没收 */
  outcome: 'win' | 'refund' | 'lose';
  /** 实际应返还的筹码（含本金）；未中为 0 */
  payout: number;
}

export interface BettingSettlement {
  entries: StakeSettlementEntry[];
  /** 每个玩家应增加的筹码总数（仅押注部分） */
  payoutByPlayer: Map<string, number>;
}

/**
 * 结算所有玩家在所有轮次的押注。
 *
 * 必须在 state.closed 已设置后调用（成交或流拍均可）。
 *
 * @param trueValue 仓库真实总值（结算用，等于 state.warehouse.totalValue）
 */
export function settleStakes(state: AuctionState): BettingSettlement {
  if (!state.closed) {
    throw new Error('settleStakes: 拍卖未结束');
  }
  const trueValue = state.warehouse.totalValue;
  const closingRound = state.closed.closingRound;
  const isVoided = state.closed.winnerId === null && state.closed.price === 0;

  const entries: StakeSettlementEntry[] = [];
  const payoutByPlayer = new Map<string, number>();

  for (const round of state.rounds) {
    for (const [playerId, stake] of round.stakes.entries()) {
      if (!stake) continue;
      let outcome: StakeSettlementEntry['outcome'];
      let payout = 0;

      if (isVoided || round.round !== closingRound) {
        // 未成交那轮（或全程流拍）→ 原额退回
        outcome = 'refund';
        payout = stake.amount;
      } else {
        // 成交那一轮：判定真实总值是否在 ±10% 区间
        const band = CONFIG.betting.valueBandPercent;
        const lo = stake.basisBid * (1 - band);
        const hi = stake.basisBid * (1 + band);
        if (trueValue >= lo && trueValue <= hi) {
          outcome = 'win';
          const mul = CONFIG.betting.payoutMultipliers[round.round - 1];
          payout = Math.round(stake.amount * mul);
        } else {
          outcome = 'lose';
          payout = 0;
        }
      }

      entries.push({ playerId, round: round.round, stake, outcome, payout });
      payoutByPlayer.set(
        playerId,
        (payoutByPlayer.get(playerId) ?? 0) + payout
      );
    }
  }

  return { entries, payoutByPlayer };
}

/**
 * 在 settle()（chips 主结算）之外，独立把押注退/付应用到玩家筹码。
 * 返回新的玩家数组。
 */
export function applyStakePayouts(
  players: Player[],
  settlement: BettingSettlement
): Player[] {
  return players.map((p) => {
    const add = settlement.payoutByPlayer.get(p.id) ?? 0;
    return { ...p, chips: p.chips + add };
  });
}

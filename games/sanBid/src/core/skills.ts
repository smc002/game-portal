// 竞拍人技能引擎 — M4
// 详见 DESIGN.md §6.3
//
// 触发模型：
//   - 'round-start' 型：在某轮开始前触发一次（如司马懿 R4）
//   - 'after-bid'  型：每轮报价提交后触发一次（仅当本仓未成交时；诸葛亮、曹操）
//
// 副作用：
//   - 更新 state.reveals.get(playerId) 中的 quality / silhouette 集合
//   - 信息严格隔离 —— 每位玩家只看到自己技能产出
//
// 揭示策略：
//   - 从尚未被自己揭过的候选池中随机抽 N 件
//   - 若候选不足 N 件，按实际数量揭

import type { AuctionState, BidderSkill, Player, RevealedSet } from './types.ts';

// ---------- 应用单个技能 ----------
function applySkill(
  state: AuctionState,
  player: Player,
  skill: BidderSkill,
  rng: () => number
): void {
  const reveals = state.reveals.get(player.id);
  if (!reveals) {
    throw new Error(`applySkill: player ${player.id} 没有 reveals 集合`);
  }

  // 候选池：根据 revealKind 决定哪些藏品有"未揭示"的部分可揭
  const candidates = state.warehouse.items.filter((it) => {
    if (skill.revealKind === 'quality') return !reveals.quality.has(it.id);
    if (skill.revealKind === 'silhouette') return !reveals.silhouette.has(it.id);
    if (skill.revealKind === 'quality+silhouette') {
      return !reveals.quality.has(it.id) || !reveals.silhouette.has(it.id);
    }
    return false;
  });

  // 数量：Infinity 表示揭全部
  const wanted =
    skill.revealCount === Infinity
      ? candidates.length
      : Math.min(skill.revealCount, candidates.length);

  if (wanted === 0) return;

  // Fisher-Yates 洗牌后取前 wanted 个
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, wanted);

  for (const it of picks) {
    if (skill.revealKind === 'quality' || skill.revealKind === 'quality+silhouette') {
      reveals.quality.add(it.id);
    }
    if (skill.revealKind === 'silhouette' || skill.revealKind === 'quality+silhouette') {
      reveals.silhouette.add(it.id);
    }
  }
}

// ---------- 入口：'round-start' 型 ----------
/**
 * 在某轮开始前触发所有玩家的 round-start 技能（若 triggerRound 匹配）
 * 调用时机：
 *   - createAuction 末尾，触发 R1 的开局技能（一般无武将匹配）
 *   - submitRoundBids 决定进入下一轮时，触发 (currentRound+1) 的开局技能
 */
export function triggerRoundStartSkills(
  state: AuctionState,
  upcomingRound: number,
  rng: () => number = Math.random
): void {
  for (const p of state.players) {
    const skill = p.general.skill;
    if (skill.trigger === 'round-start' && skill.triggerRound === upcomingRound) {
      applySkill(state, p, skill, rng);
    }
  }
}

// ---------- 入口：'after-bid' 型 ----------
/**
 * 触发所有玩家的 after-bid 技能。
 * 调用时机：submitRoundBids 中，本轮未成交即将进入下一轮时。
 */
export function triggerAfterBidSkills(
  state: AuctionState,
  rng: () => number = Math.random
): void {
  for (const p of state.players) {
    const skill = p.general.skill;
    if (skill.trigger === 'after-bid') {
      applySkill(state, p, skill, rng);
    }
  }
}

// ---------- 调试：返回某玩家当前的揭示集快照 ----------
export function getRevealsSnapshot(state: AuctionState, playerId: string): RevealedSet {
  const r = state.reveals.get(playerId);
  if (!r) return { quality: new Set(), silhouette: new Set() };
  return {
    quality: new Set(r.quality),
    silhouette: new Set(r.silhouette),
  };
}

import type { CombatantEntity } from '../types/battle.js';
import { DamageType } from '../types/battle.js';
import type { HeroInstance, StatusEffect } from '../types/hero.js';
import { Faction, HeroClass } from '../types/hero.js';
import { BattleEventEmitter } from './events.js';

/** 战斗上下文：技能执行时可访问的所有状态和操作 */
export interface BattleContext {
  myPlayer: CombatantEntity;
  enemyPlayer: CombatantEntity;
  /** 绝对引用，用于事件中正确标记 'A'/'B' */
  playerA: CombatantEntity;
  emitter: BattleEventEmitter;
}

/** 获取目标的绝对side标识 */
function getSide(ctx: BattleContext, target: CombatantEntity): 'A' | 'B' {
  return target === ctx.playerA ? 'A' : 'B';
}

/** 造成伤害 */
export function dealDamage(
  ctx: BattleContext,
  target: CombatantEntity,
  amount: number,
  type: DamageType,
  sourceHeroId: string
): number {
  if (amount <= 0) return 0;
  const side = getSide(ctx, target);
  let actualDamage = amount;

  if (type === DamageType.Normal && target.shield > 0) {
    const shieldAbsorb = Math.min(target.shield, amount);
    target.shield -= shieldAbsorb;
    actualDamage = amount - shieldAbsorb;
    if (shieldAbsorb > 0) {
      ctx.emitter.emit({ type: 'shield_change', target: side, amount: -shieldAbsorb, sourceHeroId });
    }
  }

  if (actualDamage > 0) {
    target.currentHp = Math.max(0, target.currentHp - actualDamage);
    ctx.emitter.emit({
      type: 'damage',
      target: side,
      amount: actualDamage,
      isTrueDamage: type === DamageType.True,
      sourceHeroId,
    });
  }

  return actualDamage;
}

/** 治疗 */
export function heal(
  ctx: BattleContext,
  target: CombatantEntity,
  amount: number,
  sourceHeroId: string
): number {
  if (amount <= 0) return 0;
  const side = getSide(ctx, target);
  const actualHeal = Math.min(amount, target.maxHp - target.currentHp);
  target.currentHp += actualHeal;
  if (actualHeal > 0) {
    ctx.emitter.emit({ type: 'heal', target: side, amount: actualHeal, sourceHeroId });
  }
  return actualHeal;
}

/** 添加护盾 */
export function addShield(
  ctx: BattleContext,
  target: CombatantEntity,
  amount: number,
  sourceHeroId: string
): void {
  if (amount <= 0) return;
  const side = getSide(ctx, target);
  target.shield += amount;
  ctx.emitter.emit({ type: 'shield_change', target: side, amount, sourceHeroId });
}

/** 修改ATB */
export function modifyATB(
  ctx: BattleContext,
  hero: HeroInstance,
  amount: number,
  side: 'A' | 'B',
  position: number
): void {
  hero.atb = Math.max(0, hero.atb + amount);
  ctx.emitter.emit({ type: 'atb_modified', heroId: hero.instanceId, side, position, amount });
}

/** 添加Buff */
export function addBuff(
  ctx: BattleContext,
  targetId: string,
  targetType: 'hero' | 'player',
  buffName: string,
  stacks: number,
  duration: number = -1,
  data?: Record<string, number>
): void {
  // 找到实际挂载目标
  let buffList: StatusEffect[] | undefined;
  if (targetType === 'player') {
    const player = [ctx.myPlayer, ctx.enemyPlayer].find(p => p.playerId === targetId);
    buffList = player?.buffs;
  } else {
    for (const player of [ctx.myPlayer, ctx.enemyPlayer]) {
      for (const hero of player.formation) {
        if (hero && hero.instanceId === targetId) {
          buffList = hero.buffs;
          break;
        }
      }
    }
  }

  if (!buffList) return;

  const existing = buffList.find(b => b.name === buffName);
  if (existing) {
    existing.stacks += stacks;
    if (data) existing.data = { ...existing.data, ...data };
  } else {
    buffList.push({ id: `buff_${Date.now()}`, name: buffName, stacks, duration, data });
  }

  ctx.emitter.emit({ type: 'buff_applied', target: targetId, targetType, buffName, stacks });
}

/** 移除Buff */
export function removeBuff(
  ctx: BattleContext,
  targetId: string,
  targetType: 'hero' | 'player',
  buffName: string
): number {
  let buffList: StatusEffect[] | undefined;
  if (targetType === 'player') {
    const player = [ctx.myPlayer, ctx.enemyPlayer].find(p => p.playerId === targetId);
    buffList = player?.buffs;
  } else {
    for (const player of [ctx.myPlayer, ctx.enemyPlayer]) {
      for (const hero of player.formation) {
        if (hero && hero.instanceId === targetId) {
          buffList = hero.buffs;
          break;
        }
      }
    }
  }

  if (!buffList) return 0;

  const idx = buffList.findIndex(b => b.name === buffName);
  if (idx === -1) return 0;

  const removed = buffList[idx];
  buffList.splice(idx, 1);
  ctx.emitter.emit({ type: 'buff_removed', target: targetId, targetType, buffName });
  return removed.stacks;
}

/** 标签计数器：统计阵营数量 */
export function countByFaction(formation: (HeroInstance | null)[], faction: Faction): number {
  return formation.filter(h => h !== null && h.faction === faction).length;
}

/** 标签计数器：统计职业数量 */
export function countByClass(formation: (HeroInstance | null)[], heroClass: HeroClass): number {
  return formation.filter(h => h !== null && h.heroClass === heroClass).length;
}

/** 站位寻址：获取左侧武将 */
export function getHeroAtLeft(formation: (HeroInstance | null)[], position: number): HeroInstance | null {
  if (position <= 0) return null;
  return formation[position - 1] ?? null;
}

/** 站位寻址：获取右侧武将 */
export function getHeroAtRight(formation: (HeroInstance | null)[], position: number): HeroInstance | null {
  if (position >= formation.length - 1) return null;
  return formation[position + 1] ?? null;
}

/** 获取武将在阵型中的位置索引 */
export function getHeroPosition(formation: (HeroInstance | null)[], heroId: string): number {
  return formation.findIndex(h => h?.instanceId === heroId);
}

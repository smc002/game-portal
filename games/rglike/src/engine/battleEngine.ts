import { BattleUnit, BattleAction, BattleStatus, HeroInstance } from '../types';
import { getHeroDefinition } from '../data/heroes';
import { computeHeroStats } from './heroUtils';
import { executeAction } from './aiLogic';
import { ACTION_BAR_MAX, TICK_INCREMENT } from '../utils/constants';

export interface TickResult {
  allies: BattleUnit[];
  enemies: BattleUnit[];
  actions: BattleAction[];
  status: BattleStatus;
}

export function createAllyUnits(heroes: HeroInstance[], ownedItemIds: string[]): BattleUnit[] {
  return heroes.map((hero) => {
    const def = getHeroDefinition(hero.definitionId);
    const stats = computeHeroStats(hero, ownedItemIds);

    const unit: BattleUnit = {
      id: `ally_${hero.definitionId}`,
      name: def.name,
      side: 'ally',
      role: def.role,
      heroId: hero.definitionId,
      currentHp: stats.hp,
      maxHp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      actionBar: 0,
      statusEffects: [],
      isAlive: true,
      level: hero.level,
      passiveState: {},
    };

    return unit;
  });
}

export function applyBattleStartEffects(
  allies: BattleUnit[],
  enemies: BattleUnit[],
  ownedItemIds: string[]
): BattleAction[] {
  const actions: BattleAction[] = [];

  // Item: 兵法书 - 30% initial action bar
  if (ownedItemIds.includes('bingFaShu')) {
    for (const ally of allies) {
      ally.actionBar = 300;
    }
    actions.push({
      actorId: 'system',
      actorName: '系统',
      type: 'itemEffect',
      targets: allies.map((a) => ({ unitId: a.id })),
      description: '兵法书效果：全队获得30%初始行动条',
    });
  }

  // Item: 八卦阵图 - 10% HP shield
  if (ownedItemIds.includes('baGuaZhenTu')) {
    for (const ally of allies) {
      ally.statusEffects.push({
        type: 'shield',
        value: Math.round(ally.maxHp * 0.1),
        remainingActions: 999,
        sourceUnitId: 'item',
      });
    }
    actions.push({
      actorId: 'system',
      actorName: '系统',
      type: 'itemEffect',
      targets: allies.map((a) => ({ unitId: a.id, statusApplied: 'shield' })),
      description: '八卦阵图效果：全队获得护盾',
    });
  }

  // Sima Yi passive: 15% HP shield
  const siMaYi = allies.find((a) => a.heroId === 'siMaYi');
  if (siMaYi) {
    const shieldPercent = 0.15 + ((siMaYi.level || 1) - 1) * 0.03;
    siMaYi.statusEffects.push({
      type: 'shield',
      value: Math.round(siMaYi.maxHp * shieldPercent),
      remainingActions: 999,
      sourceUnitId: siMaYi.id,
    });
    actions.push({
      actorId: siMaYi.id,
      actorName: siMaYi.name,
      type: 'passive',
      targets: [{ unitId: siMaYi.id, statusApplied: 'shield' }],
      description: `${siMaYi.name} 的隐忍被动：获得护盾`,
    });
  }

  // Zhang Fei passive low HP def boost is checked in damage calc, not here

  return actions;
}

function processStatusEffects(unit: BattleUnit): BattleAction[] {
  const actions: BattleAction[] = [];

  // Process burn damage
  const burns = unit.statusEffects.filter((e) => e.type === 'burn');
  for (const burn of burns) {
    unit.currentHp = Math.max(0, unit.currentHp - burn.value);
    actions.push({
      actorId: burn.sourceUnitId,
      actorName: '灼烧',
      type: 'dot',
      targets: [{ unitId: unit.id, damage: burn.value, killed: unit.currentHp <= 0 }],
      description: `${unit.name} 受到 ${burn.value} 点灼烧伤害`,
    });
    if (unit.currentHp <= 0) {
      unit.isAlive = false;
      break;
    }
  }

  // Process HoT
  const hots = unit.statusEffects.filter((e) => e.type === 'hot');
  for (const hot of hots) {
    const healed = Math.min(hot.value, unit.maxHp - unit.currentHp);
    if (healed > 0) {
      unit.currentHp += healed;
      actions.push({
        actorId: hot.sourceUnitId,
        actorName: '持续回复',
        type: 'dot',
        targets: [{ unitId: unit.id, healing: healed }],
        description: `${unit.name} 恢复 ${healed} 点生命值`,
      });
    }
  }

  // Decrement durations
  unit.statusEffects = unit.statusEffects.filter((e) => {
    if (e.type === 'shield') return e.value > 0;
    e.remainingActions--;
    return e.remainingActions > 0;
  });

  return actions;
}

export function simulateTick(
  allies: BattleUnit[],
  enemies: BattleUnit[],
  ownedItemIds: string[]
): TickResult {
  const actions: BattleAction[] = [];
  const allUnits = { allies, enemies };

  // Advance action bars
  const aliveUnits = [...allies, ...enemies].filter((u) => u.isAlive);
  for (const unit of aliveUnits) {
    const spdBuffs = unit.statusEffects.filter((e) => e.type === 'spdBuff');
    const spdDebuffs = unit.statusEffects.filter((e) => e.type === 'spdDebuff');
    const spdBonusMult = spdBuffs.reduce((acc, b) => acc + b.value, 0);
    const spdPenaltyMult = spdDebuffs.reduce((acc, b) => acc + b.value, 0);
    const effectiveSpd = unit.spd * (1 + spdBonusMult) * (1 - spdPenaltyMult);

    unit.actionBar += effectiveSpd * TICK_INCREMENT / 100;
  }

  // Collect ready units (action bar >= MAX), sorted by overflow desc
  const readyUnits = aliveUnits
    .filter((u) => u.actionBar >= ACTION_BAR_MAX)
    .sort((a, b) => b.actionBar - a.actionBar);

  for (const unit of readyUnits) {
    if (!unit.isAlive) continue;

    // Process status effects first
    const statusActions = processStatusEffects(unit);
    actions.push(...statusActions);

    if (!unit.isAlive) continue;

    // Check charm - skip action
    const charmEffect = unit.statusEffects.find((e) => e.type === 'charm');
    if (charmEffect) {
      actions.push({
        actorId: unit.id,
        actorName: unit.name,
        type: 'skill',
        targets: [],
        description: `${unit.name} 被魅惑，无法行动`,
      });
      unit.actionBar -= ACTION_BAR_MAX;
      continue;
    }

    // Execute action
    const action = executeAction(unit, allUnits, ownedItemIds);
    actions.push(action);

    // Reset action bar
    unit.actionBar -= ACTION_BAR_MAX;

    // Guan Yu: clear stacks when hit
    // (this is handled when enemies attack in aiLogic)

    // Check win/loss conditions
    const allAlliesDead = allies.every((a) => !a.isAlive);
    const allEnemiesDead = enemies.every((e) => !e.isAlive);

    if (allAlliesDead) {
      return { allies, enemies, actions, status: 'lost' };
    }
    if (allEnemiesDead) {
      return { allies, enemies, actions, status: 'won' };
    }
  }

  return { allies, enemies, actions, status: 'running' };
}

export function runFullBattle(
  allies: BattleUnit[],
  enemies: BattleUnit[],
  ownedItemIds: string[]
): { status: 'won' | 'lost'; actions: BattleAction[] } {
  const allActions: BattleAction[] = [];
  const startActions = applyBattleStartEffects(allies, enemies, ownedItemIds);
  allActions.push(...startActions);

  let status: BattleStatus = 'running';
  let safetyCounter = 0;

  while (status === 'running' && safetyCounter < 5000) {
    const result = simulateTick(allies, enemies, ownedItemIds);
    allActions.push(...result.actions);
    status = result.status;
    safetyCounter++;
  }

  if (status === 'running') status = 'lost'; // timeout = loss

  return { status: status as 'won' | 'lost', actions: allActions };
}

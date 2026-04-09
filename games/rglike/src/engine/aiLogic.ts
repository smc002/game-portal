import { BattleUnit, BattleAction, BattleActionTarget, StatusEffect } from '../types';
import { getHeroDefinition } from '../data/heroes';
import { ENEMY_TEMPLATES, BOSS_DEFINITIONS } from '../data/enemies';
import { calculateDamage, applyDamage, applyHealing } from './damageCalc';
import { random } from '../utils/random';

type AllUnits = { allies: BattleUnit[]; enemies: BattleUnit[] };

function getAliveUnits(units: BattleUnit[]): BattleUnit[] {
  return units.filter((u) => u.isAlive);
}

function getEnemiesOf(unit: BattleUnit, all: AllUnits): BattleUnit[] {
  return getAliveUnits(unit.side === 'ally' ? all.enemies : all.allies);
}

function getAlliesOf(unit: BattleUnit, all: AllUnits): BattleUnit[] {
  return getAliveUnits(unit.side === 'ally' ? all.allies : all.enemies);
}

function hasTauntTarget(unit: BattleUnit, all: AllUnits): BattleUnit | null {
  if (unit.side !== 'enemy') return null;
  const tauntEffect = unit.statusEffects.find((e) => e.type === 'taunt');
  if (!tauntEffect) return null;
  const taunter = all.allies.find((a) => a.id === tauntEffect.sourceUnitId && a.isAlive);
  return taunter || null;
}

function pickRandomTarget(targets: BattleUnit[]): BattleUnit {
  return targets[Math.floor(random() * targets.length)];
}

function lowestHpTarget(targets: BattleUnit[]): BattleUnit {
  return targets.reduce((a, b) => (a.currentHp < b.currentHp ? a : b));
}

function highestHpTarget(targets: BattleUnit[]): BattleUnit {
  return targets.reduce((a, b) => (a.currentHp > b.currentHp ? a : b));
}

function lowestHpPercentTarget(targets: BattleUnit[]): BattleUnit {
  return targets.reduce((a, b) =>
    a.currentHp / a.maxHp < b.currentHp / b.maxHp ? a : b
  );
}

function highestAtkAlly(targets: BattleUnit[], excludeId?: string): BattleUnit {
  const filtered = excludeId ? targets.filter((t) => t.id !== excludeId) : targets;
  return filtered.reduce((a, b) => (a.atk > b.atk ? a : b));
}

function highestActionBarTarget(targets: BattleUnit[]): BattleUnit {
  return targets.reduce((a, b) => (a.actionBar > b.actionBar ? a : b));
}

function hasActiveBuff(unit: BattleUnit, buffType: string): boolean {
  return unit.statusEffects.some((e) => e.type === buffType);
}

export function executeAction(
  actor: BattleUnit,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  if (actor.side === 'enemy') {
    return executeEnemyAction(actor, all, ownedItemIds);
  }

  if (!actor.heroId) {
    return executeBasicAttack(actor, all, ownedItemIds);
  }

  const heroDef = getHeroDefinition(actor.heroId);

  switch (heroDef.role) {
    case 'singleDPS':
      return executeSingleDPS(actor, heroDef.id, all, ownedItemIds);
    case 'aoeDPS':
      return executeAoeDPS(actor, heroDef.id, all, ownedItemIds);
    case 'healer':
      return executeHealer(actor, all, ownedItemIds);
    case 'buffer':
      return executeBuffer(actor, heroDef.id, all, ownedItemIds);
    case 'tank':
      return executeTank(actor, all, ownedItemIds);
    case 'controller':
      return executeController(actor, heroDef.id, all, ownedItemIds);
    default:
      return executeBasicAttack(actor, all, ownedItemIds);
  }
}

function executeSingleDPS(
  actor: BattleUnit,
  heroId: string,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length === 0) return createNoTargetAction(actor);

  const target = heroId === 'zhaoYun' ? lowestHpTarget(enemies) : highestHpTarget(enemies);
  const heroDef = getHeroDefinition(heroId);
  const skillName = heroDef.skill.name;
  let multiplier = heroDef.skill.multiplier + (actor.level! - 1) * 0.2;

  let ignoreDefPercent = 0;
  let bonusDamagePercent = 0;

  // Guan Yu: ignore def
  if (heroId === 'guanYu') {
    ignoreDefPercent = 0.2 + (actor.level! - 1) * 0.05;
    // Wu Sheng passive: stacking ATK bonus
    const stacks = actor.passiveState['wuShengStacks'] || 0;
    bonusDamagePercent += stacks * 0.15;
    actor.passiveState['wuShengStacks'] = Math.min((stacks + 1), 5 + (actor.level! - 1));
  }

  // Zhao Yun: execute bonus on low HP targets
  if (heroId === 'zhaoYun') {
    const threshold = 0.3 + (actor.level! - 1) * 0.05;
    const forceExecute = actor.passiveState['forceExecute'] === 1;
    if (target.currentHp / target.maxHp < threshold || forceExecute) {
      bonusDamagePercent += 0.5;
      actor.passiveState['forceExecute'] = 0;
    }
  }

  // Diao Chan passive: bonus damage on charmed targets
  if (target.statusEffects.some((e) => e.type === 'charm')) {
    const diaoChan = all.allies.find((a) => a.heroId === 'diaoChan' && a.isAlive);
    if (diaoChan) {
      bonusDamagePercent += 0.15 + ((diaoChan.level || 1) - 1) * 0.05;
    }
  }

  // Item: qingGangJian
  if (ownedItemIds.includes('qingGangJian')) ignoreDefPercent += 0.15;

  // Item: crit chance
  let isCrit = false;
  if (ownedItemIds.includes('ciXiongShuangGuJian')) {
    isCrit = random() < 0.2;
  }

  const result = calculateDamage(actor, target, multiplier, {
    ignoreDefPercent,
    bonusDamagePercent,
    isCrit,
    ownedItemIds,
  });

  const killed = applyDamage(target, result.damage);

  const targets: BattleActionTarget[] = [
    { unitId: target.id, damage: result.damage, killed, shieldDamage: result.shieldAbsorbed },
  ];

  // Zhao Yun kill reset
  if (killed && heroId === 'zhaoYun') {
    const resetAmount = ownedItemIds.includes('liangYinQiang') ? 1000 : 500;
    actor.actionBar += resetAmount;
    if (ownedItemIds.includes('liangYinQiang')) {
      actor.passiveState['forceExecute'] = 1;
    }
  }

  // Item: fire bow burn
  if (ownedItemIds.includes('huoYanGong') && !killed) {
    const burnDmg = Math.round(target.maxHp * 0.02);
    target.statusEffects.push({
      type: 'burn',
      value: burnDmg,
      remainingActions: 1,
      sourceUnitId: actor.id,
    });
  }

  // Item: lianNu extra attack
  if (ownedItemIds.includes('lianNu') && random() < 0.3) {
    const bonusDmg = Math.round(result.damage * 0.5);
    if (target.isAlive) {
      const extraKilled = applyDamage(target, bonusDmg);
      targets[0].damage! += bonusDmg;
      if (extraKilled) targets[0].killed = true;
    }
  }

  const critText = result.isCrit ? '（暴击！）' : '';
  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName,
    targets,
    description: `${actor.name} 使用 ${skillName} 对 ${target.name} 造成 ${result.damage} 点伤害${critText}${killed ? '，击杀！' : ''}`,
  };
}

function executeAoeDPS(
  actor: BattleUnit,
  heroId: string,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length === 0) return createNoTargetAction(actor);

  const heroDef = getHeroDefinition(heroId);
  const skillName = heroDef.skill.name;
  let multiplier = heroDef.skill.multiplier + (actor.level! - 1) * 0.2;

  // Zhuge Liang passive: bonus per target
  if (heroId === 'zhuGeLiang') {
    const bonusPerTarget = 0.05 + (actor.level! - 1) * 0.02;
    multiplier *= 1 + (enemies.length - 1) * bonusPerTarget;
  }

  let ignoreDefPercent = ownedItemIds.includes('qingGangJian') ? 0.15 : 0;
  const targets: BattleActionTarget[] = [];
  let killCount = 0;

  for (const enemy of enemies) {
    let isCrit = false;
    if (ownedItemIds.includes('ciXiongShuangGuJian')) {
      isCrit = random() < 0.2;
    }

    const result = calculateDamage(actor, enemy, multiplier, {
      ignoreDefPercent,
      isCrit,
      ownedItemIds,
    });
    const killed = applyDamage(enemy, result.damage);
    if (killed) killCount++;

    targets.push({ unitId: enemy.id, damage: result.damage, killed, shieldDamage: result.shieldAbsorbed });

    // Zhou Yu passive: burn on hit
    if (heroId === 'zhouYu') {
      const burnDmg = Math.round(actor.atk * (0.2 + (actor.level! - 1) * 0.05));
      enemy.statusEffects.push({
        type: 'burn',
        value: burnDmg,
        remainingActions: 2,
        sourceUnitId: actor.id,
      });
    }

    // Zhuge Liang: burn when enemies >= 3
    if (heroId === 'zhuGeLiang' && enemies.length >= 3 && !killed) {
      const burnDmg = Math.round(actor.atk * (0.3 + (actor.level! - 1) * 0.1));
      enemy.statusEffects.push({
        type: 'burn',
        value: burnDmg,
        remainingActions: 1,
        sourceUnitId: actor.id,
      });
    }

    // Item: fire bow
    if (ownedItemIds.includes('huoYanGong') && !killed) {
      const burnDmg = Math.round(enemy.maxHp * 0.02);
      enemy.statusEffects.push({
        type: 'burn',
        value: burnDmg,
        remainingActions: 1,
        sourceUnitId: actor.id,
      });
    }
  }

  // Zhuge Liang item: action bar refund on kill
  if (heroId === 'zhuGeLiang' && ownedItemIds.includes('yuShan') && killCount > 0) {
    actor.actionBar += killCount * 250; // 25% per kill
  }

  const totalDmg = targets.reduce((sum, t) => sum + (t.damage || 0), 0);
  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName,
    targets,
    description: `${actor.name} 使用 ${skillName} 对 ${enemies.length} 个敌人造成共 ${totalDmg} 点伤害${killCount > 0 ? `，击杀 ${killCount} 人！` : ''}`,
  };
}

function executeHealer(
  actor: BattleUnit,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const allies = getAlliesOf(actor, all);
  const needHealing = allies.filter((a) => a.currentHp / a.maxHp < 0.7);

  if (needHealing.length === 0) {
    return executeBasicAttack(actor, all, ownedItemIds);
  }

  const target = lowestHpPercentTarget(needHealing);
  let multiplier = 1.8 + (actor.level! - 1) * 0.3;

  // Emergency healing boost
  if (target.currentHp / target.maxHp < 0.3 + (actor.level! - 1) * 0.05) {
    multiplier *= 1.5;
  }

  const healingBonus = ownedItemIds.includes('tongQueTai') ? 0.25 : 0;
  const healAmount = applyHealing(target, actor.atk * multiplier, healingBonus);

  const targets: BattleActionTarget[] = [{ unitId: target.id, healing: healAmount }];

  // Passive: HoT
  const hotAmount = Math.round(actor.atk * (0.2 + (actor.level! - 1) * 0.05));
  target.statusEffects.push({
    type: 'hot',
    value: hotAmount,
    remainingActions: 1,
    sourceUnitId: actor.id,
  });

  // Item: qingNangJing - shield on heal
  if (ownedItemIds.includes('qingNangJing')) {
    const shieldVal = Math.round(actor.atk * 0.3);
    target.statusEffects.push({
      type: 'shield',
      value: shieldVal,
      remainingActions: 2,
      sourceUnitId: actor.id,
    });
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName: '青囊术',
    targets,
    description: `${actor.name} 使用 青囊术 治疗 ${target.name} ${healAmount} 点生命值`,
  };
}

function executeBuffer(
  actor: BattleUnit,
  heroId: string,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const allies = getAlliesOf(actor, all);

  if (heroId === 'liuBei') {
    // Check if buff already active on highest atk ally
    const target = highestAtkAlly(allies, actor.id);
    if (hasActiveBuff(target, 'atkBuff')) {
      return executeBasicAttack(actor, all, ownedItemIds);
    }

    const atkBoost = 0.25 + (actor.level! - 1) * 0.05;
    const spdBoost = 0.15 + (actor.level! - 1) * 0.03;
    const duration = 3 + (ownedItemIds.includes('yuXi') ? 1 : 0);

    target.statusEffects.push(
      { type: 'atkBuff', value: atkBoost, remainingActions: duration, sourceUnitId: actor.id },
      { type: 'spdBuff', value: spdBoost, remainingActions: duration, sourceUnitId: actor.id }
    );

    const targets: BattleActionTarget[] = [{ unitId: target.id, statusApplied: 'atkBuff' }];

    // Item: longFengChengXiang - buff second highest ATK ally too
    if (ownedItemIds.includes('longFengChengXiang') && allies.length > 2) {
      const others = allies.filter((a) => a.id !== actor.id && a.id !== target.id);
      if (others.length > 0) {
        const second = highestAtkAlly(others);
        second.statusEffects.push(
          { type: 'atkBuff', value: atkBoost * 0.5, remainingActions: duration, sourceUnitId: actor.id },
          { type: 'spdBuff', value: spdBoost * 0.5, remainingActions: duration, sourceUnitId: actor.id }
        );
        targets.push({ unitId: second.id, statusApplied: 'atkBuff' });
      }
    }

    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'skill',
      skillName: '桃园结义',
      targets,
      description: `${actor.name} 使用 桃园结义 强化了 ${target.name} 的攻击力和速度`,
    };
  }

  // Sun Shang Xiang
  const hasSpeedBuff = allies.some((a) => a.statusEffects.some((e) => e.type === 'spdBuff' && e.sourceUnitId === actor.id));
  if (hasSpeedBuff) {
    return executeBasicAttack(actor, all, ownedItemIds);
  }

  const spdBoost = 0.2 + (actor.level! - 1) * 0.05;
  const duration = 2 + (ownedItemIds.includes('yuXi') ? 1 : 0);
  const targets: BattleActionTarget[] = [];

  for (const ally of allies) {
    ally.statusEffects.push({
      type: 'spdBuff',
      value: spdBoost,
      remainingActions: duration,
      sourceUnitId: actor.id,
    });
    targets.push({ unitId: ally.id, statusApplied: 'spdBuff' });
  }

  // Also attack one enemy
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length > 0) {
    const target = lowestHpTarget(enemies);
    let multiplier = 1.3 + (actor.level! - 1) * 0.2;

    // Passive: speed bonus to basic attack
    const effectiveSpd = actor.spd * (1 + spdBoost);
    if (effectiveSpd > 100) {
      const bonusPer10 = 0.05 + (actor.level! - 1) * 0.02;
      multiplier *= 1 + Math.floor((effectiveSpd - 100) / 10) * bonusPer10;
    }

    const result = calculateDamage(actor, target, multiplier, { ownedItemIds });
    const killed = applyDamage(target, result.damage);
    targets.push({ unitId: target.id, damage: result.damage, killed });
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName: '巾帼之舞',
    targets,
    description: `${actor.name} 使用 巾帼之舞 提升全队速度`,
  };
}

function executeTank(
  actor: BattleUnit,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length === 0) return createNoTargetAction(actor);

  // Check if any enemy is taunted by this unit
  const hasTaunt = enemies.some((e) =>
    e.statusEffects.some((s) => s.type === 'taunt' && s.sourceUnitId === actor.id)
  );

  if (hasTaunt) {
    return executeBasicAttack(actor, all, ownedItemIds);
  }

  // Cast taunt
  const duration = 2 + (actor.level! - 1) + (ownedItemIds.includes('yuXi') ? 1 : 0);
  const targets: BattleActionTarget[] = [];
  const multiplier = 0.8;

  for (const enemy of enemies) {
    enemy.statusEffects.push({
      type: 'taunt',
      value: 0,
      remainingActions: duration,
      sourceUnitId: actor.id,
    });

    // Damage + slow
    const result = calculateDamage(actor, enemy, multiplier, { ownedItemIds });
    const killed = applyDamage(enemy, result.damage);

    const spdDebuff = 0.1 + (actor.level! - 1) * 0.05;
    if (!killed) {
      enemy.statusEffects.push({
        type: 'spdDebuff',
        value: spdDebuff,
        remainingActions: 2,
        sourceUnitId: actor.id,
      });
    }

    targets.push({ unitId: enemy.id, damage: result.damage, killed, statusApplied: 'taunt' });
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName: '当阳桥喝',
    targets,
    description: `${actor.name} 使用 当阳桥喝 嘲讽所有敌人并造成伤害`,
  };
}

function executeController(
  actor: BattleUnit,
  heroId: string,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length === 0) return createNoTargetAction(actor);

  if (heroId === 'diaoChan') {
    const target = highestActionBarTarget(enemies);
    const multiplier = 1.0 + (actor.level! - 1) * 0.2;

    const result = calculateDamage(actor, target, multiplier, { ownedItemIds });
    const killed = applyDamage(target, result.damage);

    if (!killed) {
      target.actionBar = 0;
      target.statusEffects.push({
        type: 'charm',
        value: 0,
        remainingActions: 1,
        sourceUnitId: actor.id,
      });

      // Item: meiRenJi - permanent speed reduction
      if (ownedItemIds.includes('meiRenJi')) {
        target.spd = Math.round(target.spd * 0.95);
      }
    }

    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'skill',
      skillName: '倾国倾城',
      targets: [{ unitId: target.id, damage: result.damage, killed, statusApplied: killed ? undefined : 'charm' }],
      description: `${actor.name} 使用 倾国倾城 魅惑了 ${target.name}${killed ? '，击杀！' : ''}`,
    };
  }

  // Sima Yi
  const hasSlowDebuff = enemies.some((e) =>
    e.statusEffects.some((s) => s.type === 'spdDebuff' && s.sourceUnitId === actor.id)
  );

  if (hasSlowDebuff) {
    const target = highestActionBarTarget(enemies);
    const result = calculateDamage(actor, target, 1.0, { ownedItemIds });
    const killed = applyDamage(target, result.damage);

    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'basicAttack',
      targets: [{ unitId: target.id, damage: result.damage, killed }],
      description: `${actor.name} 攻击 ${target.name} 造成 ${result.damage} 点伤害`,
    };
  }

  const spdDebuffVal = 0.2 + (actor.level! - 1) * 0.05;
  const multiplier = 0.9 + (actor.level! - 1) * 0.2;
  const targets: BattleActionTarget[] = [];

  for (const enemy of enemies) {
    const result = calculateDamage(actor, enemy, multiplier, { ownedItemIds });
    const killed = applyDamage(enemy, result.damage);

    if (!killed) {
      enemy.statusEffects.push({
        type: 'spdDebuff',
        value: spdDebuffVal,
        remainingActions: 2,
        sourceUnitId: actor.id,
      });
    }

    targets.push({ unitId: enemy.id, damage: result.damage, killed, statusApplied: 'spdDebuff' });
  }

  const totalDmg = targets.reduce((sum, t) => sum + (t.damage || 0), 0);
  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName: '鹰视狼顾',
    targets,
    description: `${actor.name} 使用 鹰视狼顾 降低所有敌人速度，造成共 ${totalDmg} 点伤害`,
  };
}

function executeEnemyAction(
  actor: BattleUnit,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const allies = getAliveUnits(all.allies);
  if (allies.length === 0) return createNoTargetAction(actor);

  // Check for charm - skip action
  const charmEffect = actor.statusEffects.find((e) => e.type === 'charm');
  if (charmEffect) {
    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'skill',
      targets: [],
      description: `${actor.name} 被魅惑，无法行动`,
    };
  }

  // Check taunt
  const tauntTarget = hasTauntTarget(actor, all);

  // Boss phase check
  if (actor.isBoss && actor.bossPhase === 1 && actor.currentHp / actor.maxHp <= (actor.bossPhaseThreshold || 0.5)) {
    actor.bossPhase = 2;
    actor.passiveState['phaseChanged'] = 1;

    // Boss special effects on phase change
    const bossDef = BOSS_DEFINITIONS.find((b) => actor.name === b.name);
    if (bossDef) {
      // Apply boss-specific phase 2 buffs
      if (bossDef.id === 'boss_1') { // 黄巾力士: ATK and SPD +20%
        actor.atk = Math.round(actor.atk * 1.2);
        actor.spd = Math.round(actor.spd * 1.2);
      } else if (bossDef.id === 'boss_5') { // 孙权: DEF=0, ATK*2
        actor.def = 0;
        actor.atk *= 2;
      }
    }

    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'phaseChange',
      targets: [],
      description: `${actor.name} 进入狂暴状态！`,
    };
  }

  // Boss phase 2 skill or normal skill
  const isBossPhase2 = actor.isBoss && actor.bossPhase === 2;

  // Determine skill from enemy template or boss definition
  let skillName = '攻击';
  let multiplier = 1.2;
  let isAoE = false;

  if (actor.isBoss) {
    const bossDef = BOSS_DEFINITIONS.find((b) => actor.name === b.name);
    if (bossDef) {
      const skill = isBossPhase2 && bossDef.bossPhase2Skill ? bossDef.bossPhase2Skill : bossDef.skill;
      skillName = skill.name;
      multiplier = skill.multiplier;
      isAoE = skill.isAoE;
    }
  } else {
    const template = ENEMY_TEMPLATES.find((t) => t.type === actor.role);
    if (template) {
      skillName = template.skill.name;
      multiplier = template.skill.multiplier;
      isAoE = template.skill.isAoE;
    }
  }

  // Boss healing in phase 2 (吕布)
  if (actor.isBoss && actor.name === '吕布' && isBossPhase2) {
    const healAmount = Math.round(actor.maxHp * 0.05);
    actor.currentHp = Math.min(actor.maxHp, actor.currentHp + healAmount);
  }

  if (isAoE) {
    const targets: BattleActionTarget[] = [];
    for (const ally of allies) {
      const result = calculateDamage(actor, ally, multiplier, { ownedItemIds: [] });
      const killed = applyDamage(ally, result.damage);

      // Zhang Fei reflect
      if (ownedItemIds.includes('zhangBaSheMao') && ally.heroId === 'zhangFei') {
        const tauntActive = actor.statusEffects.some((e) => e.type === 'taunt' && e.sourceUnitId === ally.id);
        if (tauntActive) {
          const reflectDmg = Math.round(result.damage * 0.15);
          applyDamage(actor, reflectDmg);
        }
      }

      // Jin Chan Tuo Qiao
      if (ownedItemIds.includes('jinChanTuoQiao') && ally.currentHp > 0 && ally.currentHp < ally.maxHp * 0.1) {
        if (!ally.passiveState['jinChanUsed']) {
          const healAmt = Math.round(ally.maxHp * 0.3);
          ally.currentHp += healAmt;
          ally.isAlive = true;
          ally.passiveState['jinChanUsed'] = 1;
        }
      }

      targets.push({ unitId: ally.id, damage: result.damage, killed });
    }

    const totalDmg = targets.reduce((sum, t) => sum + (t.damage || 0), 0);
    return {
      actorId: actor.id,
      actorName: actor.name,
      type: 'skill',
      skillName,
      targets,
      description: `${actor.name} 使用 ${skillName} 造成共 ${totalDmg} 点范围伤害`,
    };
  }

  // Single target
  const target = tauntTarget || pickRandomTarget(allies);
  const result = calculateDamage(actor, target, multiplier, { ownedItemIds: [] });
  const killed = applyDamage(target, result.damage);

  // Zhang Fei reflect
  if (ownedItemIds.includes('zhangBaSheMao') && target.heroId === 'zhangFei') {
    const tauntActive = actor.statusEffects.some((e) => e.type === 'taunt' && e.sourceUnitId === target.id);
    if (tauntActive) {
      const reflectDmg = Math.round(result.damage * 0.15);
      applyDamage(actor, reflectDmg);
    }
  }

  // Jin Chan Tuo Qiao
  if (ownedItemIds.includes('jinChanTuoQiao') && target.currentHp > 0 && target.currentHp < target.maxHp * 0.1) {
    if (!target.passiveState['jinChanUsed']) {
      const healAmt = Math.round(target.maxHp * 0.3);
      target.currentHp += healAmt;
      target.isAlive = true;
      target.passiveState['jinChanUsed'] = 1;
    }
  }

  // Liu Bei passive: ATK boost when ally dies
  if (killed && target.side === 'ally') {
    const liuBei = all.allies.find((a) => a.heroId === 'liuBei' && a.isAlive);
    if (liuBei) {
      const aliveAllies = getAliveUnits(all.allies);
      for (const ally of aliveAllies) {
        ally.atk = Math.round(ally.atk * 1.1);
      }
    }
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'skill',
    skillName,
    targets: [{ unitId: target.id, damage: result.damage, killed }],
    description: `${actor.name} 使用 ${skillName} 对 ${target.name} 造成 ${result.damage} 点伤害${killed ? '，击杀！' : ''}`,
  };
}

function executeBasicAttack(
  actor: BattleUnit,
  all: AllUnits,
  ownedItemIds: string[]
): BattleAction {
  const enemies = getEnemiesOf(actor, all);
  if (enemies.length === 0) return createNoTargetAction(actor);

  const target = pickRandomTarget(enemies);
  let multiplier = 1.0;

  // Sun Shang Xiang passive
  if (actor.heroId === 'sunShangXiang') {
    const effectiveSpd = actor.spd;
    if (effectiveSpd > 100) {
      const bonusPer10 = 0.05 + ((actor.level || 1) - 1) * 0.02;
      multiplier *= 1 + Math.floor((effectiveSpd - 100) / 10) * bonusPer10;
    }
    multiplier = 1.1; // Base multiplier for her basic attack
  }

  let isCrit = false;
  if (ownedItemIds.includes('ciXiongShuangGuJian')) {
    isCrit = random() < 0.2;
  }

  const result = calculateDamage(actor, target, multiplier, { isCrit, ownedItemIds });
  const killed = applyDamage(target, result.damage);

  // Guan Yu: clear stacks when hit (happens in damage received, but we track attack stacking here)
  if (actor.heroId === 'guanYu') {
    actor.passiveState['wuShengStacks'] = (actor.passiveState['wuShengStacks'] || 0) + 1;
    if (actor.passiveState['wuShengStacks'] > 5 + ((actor.level || 1) - 1)) {
      actor.passiveState['wuShengStacks'] = 5 + ((actor.level || 1) - 1);
    }
  }

  // Item: lianNu
  const targets: BattleActionTarget[] = [{ unitId: target.id, damage: result.damage, killed }];
  if (ownedItemIds.includes('lianNu') && random() < 0.3 && target.isAlive) {
    const bonusDmg = Math.round(result.damage * 0.5);
    const extraKilled = applyDamage(target, bonusDmg);
    targets[0].damage! += bonusDmg;
    if (extraKilled) targets[0].killed = true;
  }

  // Item: fire bow
  if (ownedItemIds.includes('huoYanGong') && !targets[0].killed) {
    const burnDmg = Math.round(target.maxHp * 0.02);
    target.statusEffects.push({
      type: 'burn',
      value: burnDmg,
      remainingActions: 1,
      sourceUnitId: actor.id,
    });
  }

  const critText = result.isCrit ? '（暴击！）' : '';
  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'basicAttack',
    targets,
    description: `${actor.name} 攻击 ${target.name} 造成 ${result.damage} 点伤害${critText}${killed ? '，击杀！' : ''}`,
  };
}

function createNoTargetAction(actor: BattleUnit): BattleAction {
  return {
    actorId: actor.id,
    actorName: actor.name,
    type: 'basicAttack',
    targets: [],
    description: `${actor.name} 没有可攻击的目标`,
  };
}

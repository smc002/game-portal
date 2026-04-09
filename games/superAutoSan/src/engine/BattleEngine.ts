import type { BattleEvent, GeneralInstance, Side } from '../data/types';
import { getDef, getEffectiveAtk, createInstance } from './helpers';
import { generals } from '../data/generals';

interface BattleResult {
  events: BattleEvent[];
  result: 'win' | 'lose' | 'draw';
}

export function executeBattle(
  playerTeamInput: GeneralInstance[],
  enemyTeamInput: GeneralInstance[]
): BattleResult {
  // Deep copy teams
  const playerTeam: GeneralInstance[] = JSON.parse(JSON.stringify(playerTeamInput));
  const enemyTeam: GeneralInstance[] = JSON.parse(JSON.stringify(enemyTeamInput));
  const events: BattleEvent[] = [];

  events.push({ type: 'battle_start' });
  emitSnapshot(events, playerTeam, enemyTeam);

  // Start of battle triggers (sorted by ATK, highest first)
  executeStartOfBattle(playerTeam, enemyTeam, events, 'player');
  executeStartOfBattle(enemyTeam, playerTeam, events, 'enemy');
  emitSnapshot(events, playerTeam, enemyTeam);

  // Main battle loop
  let safetyCounter = 0;
  while (getAlive(playerTeam).length > 0 && getAlive(enemyTeam).length > 0 && safetyCounter < 100) {
    safetyCounter++;

    const pFront = getAlive(playerTeam)[0];
    const eFront = getAlive(enemyTeam)[0];
    if (!pFront || !eFront) break;

    const pIdx = playerTeam.indexOf(pFront);
    const eIdx = enemyTeam.indexOf(eFront);

    // Before attack triggers
    executeTrigger(pFront, 'beforeAttack', playerTeam, enemyTeam, events, 'player', pIdx);
    executeTrigger(eFront, 'beforeAttack', enemyTeam, playerTeam, events, 'enemy', eIdx);

    // Both sides attack simultaneously
    const pAtk = getEffectiveAtk(pFront);
    const eAtk = getEffectiveAtk(eFront);

    // Apply perk bonuses
    const pBonus = getPerkAttackBonus(pFront);
    const eBonus = getPerkAttackBonus(eFront);

    const pDamage = pAtk + pBonus;
    const eDamage = eAtk + eBonus;

    events.push({ type: 'attack', attackerSide: 'player', attackerIdx: pIdx, defenderSide: 'enemy', defenderIdx: eIdx, damage: pDamage });
    events.push({ type: 'attack', attackerSide: 'enemy', attackerIdx: eIdx, defenderSide: 'player', defenderIdx: pIdx, damage: eDamage });

    // Apply damage with perk defense
    applyDamage(eFront, pDamage, events, 'enemy', eIdx);
    applyDamage(pFront, eDamage, events, 'player', pIdx);

    // Poison perk (淬毒): instant kill on hit
    if (hasPoisonPerk(pFront) && eFront.hp > 0) {
      eFront.hp = 0;
      events.push({ type: 'perk_trigger', side: 'player', idx: pIdx, perkId: 'cuidu', effect: '淬毒！一击必杀' });
      events.push({ type: 'hurt', side: 'enemy', idx: eIdx, hpBefore: eFront.hp, hpAfter: 0 });
    }
    if (hasPoisonPerk(eFront) && pFront.hp > 0) {
      pFront.hp = 0;
      events.push({ type: 'perk_trigger', side: 'enemy', idx: eIdx, perkId: 'cuidu', effect: '淬毒！一击必杀' });
      events.push({ type: 'hurt', side: 'player', idx: pIdx, hpBefore: pFront.hp, hpAfter: 0 });
    }

    // After attack triggers
    if (pFront.hp > 0) executeTrigger(pFront, 'afterAttack', playerTeam, enemyTeam, events, 'player', pIdx);
    if (eFront.hp > 0) executeTrigger(eFront, 'afterAttack', enemyTeam, playerTeam, events, 'enemy', eIdx);

    const eDied = eFront.hp <= 0;
    const pDied = pFront.hp <= 0;

    // Emit faint events together so they batch in the UI
    if (eDied) events.push({ type: 'faint', side: 'enemy', idx: eIdx, generalId: eFront.defId });
    if (pDied) events.push({ type: 'faint', side: 'player', idx: pIdx, generalId: pFront.defId });

    // Knock out triggers (attacker survived, defender died)
    if (eDied && !pDied) {
      executeTrigger(pFront, 'knockOut', playerTeam, enemyTeam, events, 'player', pIdx);
    }
    if (pDied && !eDied) {
      executeTrigger(eFront, 'knockOut', enemyTeam, playerTeam, events, 'enemy', eIdx);
    }

    // Faint triggers + friend ahead faints
    if (eDied) {
      executeFaintTriggers(eFront, eIdx, enemyTeam, playerTeam, events, 'enemy');
      const eNext = getAlive(enemyTeam)[0];
      if (eNext) {
        const nextIdx = enemyTeam.indexOf(eNext);
        executeTrigger(eNext, 'friendAheadFaints', enemyTeam, playerTeam, events, 'enemy', nextIdx);
      }
    }
    if (pDied) {
      executeFaintTriggers(pFront, pIdx, playerTeam, enemyTeam, events, 'player');
      const pNext = getAlive(playerTeam)[0];
      if (pNext) {
        const nextIdx = playerTeam.indexOf(pNext);
        executeTrigger(pNext, 'friendAheadFaints', playerTeam, enemyTeam, events, 'player', nextIdx);
      }
    }

    // Hurt triggers (survived damage)
    if (!eDied && pDamage > 0) {
      executeTrigger(eFront, 'hurt', enemyTeam, playerTeam, events, 'enemy', eIdx);
    }
    if (!pDied && eDamage > 0) {
      executeTrigger(pFront, 'hurt', playerTeam, enemyTeam, events, 'player', pIdx);
    }

    // Chili perk: damage pet behind the target
    if (pFront.perk === 'lieyan' && eDied) {
      const behindEnemy = getAlive(enemyTeam)[0];
      if (behindEnemy) {
        const behindIdx = enemyTeam.indexOf(behindEnemy);
        events.push({ type: 'perk_trigger', side: 'player', idx: pIdx, perkId: 'lieyan', effect: '烈焰伤害' });
        applyDamage(behindEnemy, 5 * pFront.level, events, 'enemy', behindIdx);
      }
    }
    if (eFront.perk === 'lieyan' && pDied) {
      const behindPlayer = getAlive(playerTeam)[0];
      if (behindPlayer) {
        const behindIdx = playerTeam.indexOf(behindPlayer);
        events.push({ type: 'perk_trigger', side: 'enemy', idx: eIdx, perkId: 'lieyan', effect: '烈焰伤害' });
        applyDamage(behindPlayer, 5 * eFront.level, events, 'player', behindIdx);
      }
    }

    emitSnapshot(events, playerTeam, enemyTeam);
  }

  // Determine result
  const pAlive = getAlive(playerTeam).length;
  const eAlive = getAlive(enemyTeam).length;
  const result: 'win' | 'lose' | 'draw' =
    pAlive > 0 && eAlive === 0 ? 'win' :
    pAlive === 0 && eAlive > 0 ? 'lose' :
    'draw';

  events.push({ type: 'battle_end', result });

  return { events, result };
}

// ========== Internal helpers ==========

function getAlive(team: GeneralInstance[]): GeneralInstance[] {
  return team.filter((g) => g.hp > 0);
}

function emitSnapshot(events: BattleEvent[], playerTeam: GeneralInstance[], enemyTeam: GeneralInstance[]) {
  events.push({
    type: 'snapshot',
    playerTeam: JSON.parse(JSON.stringify(playerTeam)),
    enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
  });
}

function getPerkAttackBonus(inst: GeneralInstance): number {
  if (inst.perk === 'tiegu') return 3; // Meat Bone: +3 per attack
  if (inst.perk === 'qinglongyanyuedao') {
    inst.perk = null; // one-time use
    return 20;
  }
  return 0;
}

function hasPoisonPerk(inst: GeneralInstance): boolean {
  return inst.perk === 'cuidu';
}

function applyDamage(target: GeneralInstance, rawDamage: number, events: BattleEvent[], side: Side, idx: number) {
  let damage = rawDamage;

  // Garlic/铁甲: -2 damage
  if (target.perk === 'tiejia') {
    damage = Math.max(1, damage - 2);
  }

  // Melon/铁壁: absorb 20 damage
  if (target.perk === 'tiebi') {
    if (damage <= 20) {
      damage = 0;
    } else {
      damage -= 20;
    }
    target.perk = null; // consumed
    events.push({ type: 'perk_trigger', side, idx, perkId: 'tiebi', effect: '铁壁吸收伤害' });
  }

  // Coconut/金盾: block one hit
  if (target.perk === 'jindun') {
    damage = 0;
    target.perk = null;
    events.push({ type: 'perk_trigger', side, idx, perkId: 'jindun', effect: '金盾挡住攻击' });
  }

  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - damage);
  if (damage > 0) {
    events.push({ type: 'hurt', side, idx, hpBefore, hpAfter: target.hp });
  }
}

function executeStartOfBattle(
  team: GeneralInstance[],
  enemyTeam: GeneralInstance[],
  events: BattleEvent[],
  side: Side
) {
  const sorted = [...team]
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => getDef(g.defId)?.trigger === 'startOfBattle' && g.hp > 0)
    .sort((a, b) => getEffectiveAtk(b.g) - getEffectiveAtk(a.g));

  for (const { g, i } of sorted) {
    executeTrigger(g, 'startOfBattle', team, enemyTeam, events, side, i);
  }
}

function executeTrigger(
  general: GeneralInstance,
  trigger: string,
  ownTeam: GeneralInstance[],
  enemyTeam: GeneralInstance[],
  events: BattleEvent[],
  side: Side,
  idx: number
) {
  const def = getDef(general.defId);
  if (!def || def.trigger !== trigger || general.hp <= 0) return;

  const level = general.level;
  const mult = level; // Lv1=1x, Lv2=2x, Lv3=3x

  switch (def.id) {
    // === Start of battle ===
    case 'cike': { // Mosquito: deal 1*level damage to random enemy
      const alive = getAlive(enemyTeam);
      const targets = [];
      for (let t = 0; t < mult; t++) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        if (target) targets.push(target);
      }
      for (const target of targets) {
        const tIdx = enemyTeam.indexOf(target);
        events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 暗箭伤人` });
        applyDamage(target, 1, events, otherSide(side), tIdx);
      }
      break;
    }
    case 'chendao': { // Crab: copy 50%*level of healthiest friend HP
      const friends = getAlive(ownTeam).filter((g) => g !== general);
      if (friends.length === 0) break;
      const healthiest = friends.reduce((a, b) => (a.hp > b.hp ? a : b));
      const hpGain = Math.floor(healthiest.hp * 0.5 * level);
      general.hp = Math.max(general.hp, hpGain);
      general.maxHp = Math.max(general.maxHp, hpGain);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 白毦护卫 HP→${general.hp}` });
      break;
    }
    case 'chengong': { // Dodo: give friend ahead +33%*level ATK
      const aheadIdx = idx - 1;
      const ahead = ownTeam[aheadIdx];
      if (ahead && ahead.hp > 0) {
        const bonus = Math.floor(getEffectiveAtk(general) * 0.33 * level);
        ahead.tempAtk += bonus;
        events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 献策 +${bonus} ATK` });
        events.push({ type: 'buff', side, idx: aheadIdx, atk: bonus, hp: 0, temporary: true });
      }
      break;
    }
    case 'huanggai': { // Dolphin: deal 3*level to lowest HP enemy
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const lowest = alive.reduce((a, b) => (a.hp < b.hp ? a : b));
      const tIdx = enemyTeam.indexOf(lowest);
      const dmg = 3 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 苦肉计 ${dmg}伤害` });
      applyDamage(lowest, dmg, events, otherSide(side), tIdx);
      break;
    }
    case 'jiaxu': { // Skunk: reduce highest HP enemy by 33%*level
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const highest = alive.reduce((a, b) => (a.hp > b.hp ? a : b));
      const reduction = Math.floor(highest.hp * 0.33 * level);
      highest.hp -= reduction;
      highest.maxHp -= reduction;
      const tIdx = enemyTeam.indexOf(highest);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 毒计 HP-${reduction}` });
      events.push({ type: 'hurt', side: otherSide(side), idx: tIdx, hpBefore: highest.hp + reduction, hpAfter: highest.hp });
      break;
    }
    case 'zhangliao': { // Crocodile: deal 8*level to last enemy
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const last = alive[alive.length - 1]!;
      const tIdx = enemyTeam.indexOf(last);
      const dmg = 8 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 威震逍遥津 ${dmg}伤害` });
      applyDamage(last, dmg, events, otherSide(side), tIdx);
      break;
    }
    case 'zhaoyun_sw': { // Leopard: deal 50% ATK * level to random enemy
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const target = alive[Math.floor(Math.random() * alive.length)]!;
      const tIdx = enemyTeam.indexOf(target);
      const dmg = Math.floor(getEffectiveAtk(general) * 0.5 * level);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 七进七出 ${dmg}伤害` });
      applyDamage(target, dmg, events, otherSide(side), tIdx);
      break;
    }
    case 'zhouyu': { // Whale: swallow friend ahead (simplified - just buff self)
      const aheadIdx = idx - 1;
      const ahead = ownTeam[aheadIdx];
      if (ahead && ahead.hp > 0) {
        events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 火攻吞噬 ${getDef(ahead.defId)?.name}` });
        // Store swallowed pet info in temp (simplified)
        general.tempAtk += ahead.atk;
        ahead.hp = 0;
        events.push({ type: 'faint', side, idx: aheadIdx, generalId: ahead.defId });
      }
      break;
    }

    // === Before attack ===
    case 'lvbu': { // Boar: +4*level/+2*level
      general.tempAtk += 4 * level;
      general.tempHp += 2 * level;
      general.hp += 2 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 无双 +${4*level}/${2*level}` });
      events.push({ type: 'buff', side, idx, atk: 4*level, hp: 2*level, temporary: true });
      break;
    }

    // === After attack ===
    case 'wutugu': { // Elephant: deal 1*level to friend behind
      const behindIdx = idx + 1;
      const behind = ownTeam[behindIdx];
      if (behind && behind.hp > 0) {
        events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 蛮力冲撞` });
        applyDamage(behind, 1 * level, events, side, behindIdx);
        // This can trigger hurt on the friend behind
        if (behind.hp > 0) {
          executeTrigger(behind, 'hurt', ownTeam, enemyTeam, events, side, behindIdx);
        }
      }
      break;
    }

    // === Hurt ===
    case 'zhurong': { // Peacock: +4*level ATK
      general.tempAtk += 4 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 怒火焚身 +${4*level} ATK` });
      events.push({ type: 'buff', side, idx, atk: 4*level, hp: 0, temporary: true });
      break;
    }
    case 'ganning': { // Blowfish: deal 2*level to random enemy
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const target = alive[Math.floor(Math.random() * alive.length)]!;
      const tIdx = enemyTeam.indexOf(target);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 百骑劫营 ${2*level}伤害` });
      applyDamage(target, 2 * level, events, otherSide(side), tIdx);
      break;
    }
    case 'huangzhong': { // Camel: friend behind +2*level/+2*level
      const behindIdx = idx + 1;
      const behind = ownTeam[behindIdx];
      if (behind && behind.hp > 0) {
        behind.tempAtk += 2 * level;
        behind.tempHp += 2 * level;
        behind.hp += 2 * level;
        events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 老当益壮` });
        events.push({ type: 'buff', side, idx: behindIdx, atk: 2*level, hp: 2*level, temporary: true });
      }
      break;
    }
    case 'zhangliao_hw': { // Gorilla: gain Coconut Shield
      general.perk = 'jindun';
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 虎威将军获得金盾` });
      break;
    }

    // === Knock out ===
    case 'zhangfei': { // Hippo: +3*level/+3*level
      general.atk += 3 * level;
      general.hp += 3 * level;
      general.maxHp += 3 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 万夫不当 +${3*level}/${3*level}` });
      events.push({ type: 'buff', side, idx, atk: 3*level, hp: 3*level, temporary: false });
      break;
    }
    case 'guanyu': { // Rhino: deal 4*level to first enemy (double vs T1)
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const target = alive[0]!;
      const tIdx = enemyTeam.indexOf(target);
      const targetDef = getDef(target.defId);
      const dmg = 4 * level * (targetDef?.tier === 1 ? 2 : 1);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 过五关斩六将 ${dmg}伤害` });
      applyDamage(target, dmg, events, otherSide(side), tIdx);
      break;
    }

    // === Friend ahead attacks ===
    case 'zhoucang': { // Kangaroo: +2*level/+2*level
      general.tempAtk += 2 * level;
      general.tempHp += 2 * level;
      general.hp += 2 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 助威 +${2*level}/${2*level}` });
      events.push({ type: 'buff', side, idx, atk: 2*level, hp: 2*level, temporary: true });
      break;
    }
    case 'luxun': { // Snake: deal 5*level to random enemy
      const alive = getAlive(enemyTeam);
      if (alive.length === 0) break;
      const target = alive[Math.floor(Math.random() * alive.length)]!;
      const tIdx = enemyTeam.indexOf(target);
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 火烧连营 ${5*level}伤害` });
      applyDamage(target, 5 * level, events, otherSide(side), tIdx);
      break;
    }
    case 'jiangwei': { // Tiger: repeat friend ahead's ability at jiangwei's level
      const aheadIdx = idx - 1;
      const ahead = ownTeam[aheadIdx];
      if (ahead && ahead.hp > 0) {
        const aheadDef = getDef(ahead.defId);
        if (aheadDef && aheadDef.trigger === 'friendAheadAttacks') {
          // Re-execute the ahead pet's ability at jiangwei's level
          events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 继承遗志 (重复${aheadDef.name}技能)` });
          const savedLevel = ahead.level;
          ahead.level = general.level as 1 | 2 | 3;
          executeTrigger(ahead, 'friendAheadAttacks', ownTeam, enemyTeam, events, side, aheadIdx);
          ahead.level = savedLevel;
        }
      }
      break;
    }

    // === Friend ahead faints ===
    case 'xuchu': { // Ox: gain Melon perk + 1*level ATK
      general.perk = 'tiebi';
      general.atk += 1 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 虎痴之怒 获得铁壁 +${level} ATK` });
      break;
    }

    // === Friend summoned (battle) ===
    case 'chihou': { // Horse: summoned friend +1*level ATK temp
      // This is triggered by the summon system
      break;
    }
    case 'liubei': { // Dog: +1*level/+1*level temp
      general.tempAtk += 1 * level;
      general.tempHp += 1 * level;
      general.hp += 1 * level;
      events.push({ type: 'ability_trigger', side, idx, abilityDesc: `${def.name}: 仁德之心 +${level}/${level}` });
      break;
    }
    case 'sunquan': { // Turkey: summoned friend +3*level/+3*level
      // Applied to the summoned unit by the summon system
      break;
    }
  }
}

function executeFaintTriggers(
  fainted: GeneralInstance,
  faintedIdx: number,
  ownTeam: GeneralInstance[],
  enemyTeam: GeneralInstance[],
  events: BattleEvent[],
  side: Side
) {
  const def = getDef(fainted.defId);
  if (!def) return;

  const level = fainted.level;

  // Honey/锦囊 perk: summon 1/1 bee
  if (fainted.perk === 'jinnang') {
    events.push({ type: 'perk_trigger', side, idx: faintedIdx, perkId: 'jinnang', effect: '召唤信兵' });
    summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'xinbing', 1, 1);
  }

  // Mushroom/还魂丹: respawn as 1/1
  if (fainted.perk === 'huanhundan') {
    events.push({ type: 'perk_trigger', side, idx: faintedIdx, perkId: 'huanhundan', effect: '还魂复活' });
    fainted.hp = 1;
    fainted.maxHp = 1;
    fainted.atk = 1;
    fainted.perk = null;
    fainted.tempAtk = 0;
    fainted.tempHp = 0;
    events.push({ type: 'summon', side, idx: faintedIdx, general: { ...fainted } });
    return; // Don't execute other faint triggers since it revived
  }

  switch (def.id) {
    case 'huangjinbing': { // Ant: random friend +2*level/+1*level
      const friends = getAlive(ownTeam);
      if (friends.length > 0) {
        const target = friends[Math.floor(Math.random() * friends.length)]!;
        const tIdx = ownTeam.indexOf(target);
        target.atk += 2 * level;
        target.hp += 1 * level;
        target.maxHp += 1 * level;
        events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 临终激励` });
        events.push({ type: 'buff', side, idx: tIdx, atk: 2*level, hp: 1*level, temporary: false });
      }
      break;
    }
    case 'sishi': { // Cricket: summon 1*level/1*level zombie
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 亡魂不散` });
      summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'sishi_zombie', 1*level, 1*level);
      break;
    }
    case 'caiwenji': { // Flamingo: 2 friends behind +1*level/+1*level
      const alive = getAlive(ownTeam);
      const behind = alive.slice(0, 2 * level); // up to 2*level friends
      const count = Math.min(2, behind.length);
      for (let i = 0; i < count; i++) {
        const target = behind[i]!;
        const tIdx = ownTeam.indexOf(target);
        target.atk += 1 * level;
        target.hp += 1 * level;
        target.maxHp += 1 * level;
        events.push({ type: 'buff', side, idx: tIdx, atk: 1*level, hp: 1*level, temporary: false });
      }
      if (count > 0) {
        events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 悲歌` });
      }
      break;
    }
    case 'hjlishi': { // Hedgehog: deal 2*level to ALL pets
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 同归于尽 ${2*level}伤害` });
      const dmg = 2 * level;
      for (const g of [...ownTeam, ...enemyTeam]) {
        if (g.hp > 0 && g !== fainted) {
          const gSide = ownTeam.includes(g) ? side : otherSide(side);
          const gIdx = (gSide === side ? ownTeam : enemyTeam).indexOf(g);
          applyDamage(g, dmg, events, gSide, gIdx);
        }
      }
      break;
    }
    case 'yangsong': { // Rat: summon 1/1 on enemy team
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 叛徒` });
      summonUnit(enemyTeam, ownTeam, events, otherSide(side), -1, 'neijian', 1, 1);
      break;
    }
    case 'zuoci': { // Spider: summon random T3 as 2*level/2*level
      const t3 = generals.filter((g) => g.tier === 3);
      const pick = t3[Math.floor(Math.random() * t3.length)];
      if (pick) {
        events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 幻术 召唤${pick.name}` });
        summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, pick.id, 2*level, 2*level);
      }
      break;
    }
    case 'dianwei': { // Badger: deal 50%*level ATK to adjacent
      const dmg = Math.floor(getEffectiveAtk(fainted) * 0.5 * level);
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 死战不退 ${dmg}伤害` });
      // Damage behind friend
      for (const g of ownTeam) {
        if (g.hp > 0) {
          const gIdx = ownTeam.indexOf(g);
          applyDamage(g, dmg, events, side, gIdx);
          break;
        }
      }
      // Damage front enemy
      const eFront = getAlive(enemyTeam)[0];
      if (eFront) {
        const eIdx = enemyTeam.indexOf(eFront);
        applyDamage(eFront, dmg, events, otherSide(side), eIdx);
      }
      break;
    }
    case 'zhangren': { // Sheep: summon 2 rams at 2*level/2*level
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 誓死守城` });
      summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'shoujun', 2*level, 2*level);
      summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'shoujun', 2*level, 2*level);
      break;
    }
    case 'pangtong': { // Deer: summon 5/5 bus with Chili
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 落凤坡` });
      summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'huozhen', 5, 5, 'lieyan');
      break;
    }
    case 'sunce': { // Rooster: summon chick with 1HP, 50%*level ATK
      const chickAtk = Math.floor(getEffectiveAtk(fainted) * 0.5);
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 小霸王` });
      for (let i = 0; i < level; i++) {
        summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'xiaojiang', chickAtk, 1);
      }
      break;
    }
    case 'zhaoyun': { // Turtle: friend behind gets Melon
      const alive = getAlive(ownTeam);
      const count = Math.min(level, alive.length);
      for (let i = 0; i < count; i++) {
        const target = alive[i]!;
        target.perk = 'tiebi';
        const tIdx = ownTeam.indexOf(target);
        events.push({ type: 'perk_trigger', side, idx: tIdx, perkId: 'tiebi', effect: '获得铁壁' });
      }
      if (count > 0) {
        events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 长坂护主` });
      }
      break;
    }
    case 'guanyu_ws': { // Mammoth: all friends +2*level/+2*level
      const alive = getAlive(ownTeam);
      if (alive.length > 0) {
        events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 武圣之魂` });
        for (const g of alive) {
          g.atk += 2 * level;
          g.hp += 2 * level;
          g.maxHp += 2 * level;
          const gIdx = ownTeam.indexOf(g);
          events.push({ type: 'buff', side, idx: gIdx, atk: 2*level, hp: 2*level, temporary: false });
        }
      }
      break;
    }
    case 'caocao': { // Shark: +1/+2 per friend faint (handled as faint trigger on Shark)
      // This is actually the Shark's own ability when a friend faints, not its own faint
      break;
    }
    case 'yujin': { // Fly: summon 4/4 zombie fly (max 3 per battle - simplified)
      events.push({ type: 'ability_trigger', side, idx: faintedIdx, abilityDesc: `${def.name}: 收编残兵` });
      break;
    }
  }

  // Check for Shark/曹操 on own team when a friend faints
  for (const g of getAlive(ownTeam)) {
    if (g.defId === 'caocao' && g !== fainted) {
      const gIdx = ownTeam.indexOf(g);
      g.atk += 1 * g.level;
      g.hp += 2 * g.level;
      g.maxHp += 2 * g.level;
      events.push({ type: 'ability_trigger', side, idx: gIdx, abilityDesc: `曹操: 奸雄 +${g.level}/${2*g.level}` });
      events.push({ type: 'buff', side, idx: gIdx, atk: g.level, hp: 2*g.level, temporary: true });
    }
  }

  // Fly/于禁: summon 4/4 in fainted position
  for (const g of getAlive(ownTeam)) {
    if (g.defId === 'yujin' && g !== fainted) {
      events.push({ type: 'ability_trigger', side, idx: ownTeam.indexOf(g), abilityDesc: `于禁: 收编残兵` });
      summonUnit(ownTeam, enemyTeam, events, side, faintedIdx, 'canbing', 4*g.level, 4*g.level);
      break; // Only one Fly triggers
    }
  }
}

function summonUnit(
  team: GeneralInstance[],
  enemyTeam: GeneralInstance[],
  events: BattleEvent[],
  side: Side,
  _position: number,
  defId: string,
  atk: number,
  hp: number,
  perk?: string
) {
  if (getAlive(team).length >= 5) return; // Team full

  // Create a token unit
  const tokenDef = generals.find((g) => g.id === defId);
  let inst: GeneralInstance;
  if (tokenDef) {
    inst = createInstance(tokenDef, { atk, hp, maxHp: hp, perk: perk ?? null });
  } else {
    inst = {
      defId,
      instanceId: `token_${Date.now()}_${Math.random()}`,
      atk,
      hp,
      maxHp: hp,
      level: 1,
      xp: 0,
      perk: perk ?? null,
      tempAtk: 0,
      tempHp: 0,
    };
  }

  // Insert into team (find a dead slot or append)
  let inserted = false;
  for (let i = 0; i < team.length; i++) {
    if (team[i]!.hp <= 0) {
      team[i] = inst;
      inserted = true;
      events.push({ type: 'summon', side, idx: i, general: { ...inst } });
      break;
    }
  }
  if (!inserted && team.length < 5) {
    team.push(inst);
    events.push({ type: 'summon', side, idx: team.length - 1, general: { ...inst } });
  }

  // Trigger 'summoned' on the new unit itself (e.g., 吕蒙 gains Peanut perk)
  const instDef = getDef(inst.defId);
  if (instDef?.trigger === 'summoned') {
    if (instDef.id === 'lvmeng') { // Scorpion: gain instant-kill perk
      inst.perk = 'cuidu';
      events.push({ type: 'ability_trigger', side, idx: team.indexOf(inst), abilityDesc: `${instDef.name}: 白衣渡江 获得淬毒` });
    }
  }

  // Trigger friendSummoned for Horse and Turkey
  for (const g of getAlive(team)) {
    if (g === inst) continue;
    const gDef = getDef(g.defId);
    if (!gDef) continue;

    if (gDef.id === 'chihou') { // Horse: +1*level ATK temp to summoned
      inst.tempAtk += 1 * g.level;
      events.push({ type: 'ability_trigger', side, idx: team.indexOf(g), abilityDesc: `${gDef.name}: 通风报信 +${g.level} ATK` });
    }
    if (gDef.id === 'sunquan') { // Turkey: +3*level/+3*level to summoned
      inst.atk += 3 * g.level;
      inst.hp += 3 * g.level;
      inst.maxHp += 3 * g.level;
      events.push({ type: 'ability_trigger', side, idx: team.indexOf(g), abilityDesc: `${gDef.name}: 知人善任 +${3*g.level}/${3*g.level}` });
    }
    if (gDef.id === 'liubei') { // Dog: +1*level/+1*level temp
      g.tempAtk += 1 * g.level;
      g.tempHp += 1 * g.level;
      g.hp += 1 * g.level;
      events.push({ type: 'ability_trigger', side, idx: team.indexOf(g), abilityDesc: `${gDef.name}: 仁德之心 +${g.level}/${g.level}` });
    }
  }
}

function otherSide(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player';
}

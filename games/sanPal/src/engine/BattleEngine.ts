import type {
  GeneralInstance, SkillDef,
  StatusCondition, SpecialState, BattleAction,
} from '../data/types';
import { getWeaponMultiplier, MAX_ENERGY } from '../data/types';
import { getGeneralDef } from '../data/generals';
import {
  calcEffectiveStat, clampHP, randomFloat, randomInt,
} from './helpers';
import {
  getPassiveStatMultiplier, getPassiveCritBonus, isStatusImmune, getHealMultiplier,
  getConditionalSkillMultiplier,
} from './PassiveSystem';

// ===== Damage Calculation =====

export interface DamageResult {
  damage: number;
  crit: boolean;
  effectiveness: 'super' | 'resist' | 'normal';
}

export function calcDamage(
  attacker: GeneralInstance,
  defender: GeneralInstance,
  skill: SkillDef,
  turnNumber = 1,
  extraCritRate = 0,
  allyFainted = false,
  enemySwitched = false,
): DamageResult {
  const atkDef = getGeneralDef(attacker.defId);
  const defDef = getGeneralDef(defender.defId);

  const isPhysical = skill.type === 'martial';
  const atkStat = isPhysical ? 'atk' : 'int';
  const defStat = isPhysical ? 'def' : 'res';

  let atkVal = calcEffectiveStat(atkDef, attacker.level, atkStat, attacker.statStages[atkStat]);
  let defVal = calcEffectiveStat(defDef, defender.level, defStat, defender.statStages[defStat]);

  // Passive stat multipliers
  atkVal = Math.floor(atkVal * getPassiveStatMultiplier(attacker, atkStat, turnNumber));
  defVal = Math.floor(defVal * getPassiveStatMultiplier(defender, defStat, turnNumber));

  // Base damage (reduced formula for ~3 round battles)
  let baseDmg = skill.power * (atkVal / Math.max(1, defVal)) * 0.25 + 5;

  // Weapon type advantage (attacker class vs defender class)
  const weaponMult = getWeaponMultiplier(atkDef.weapon, defDef.weapon);
  baseDmg *= weaponMult;

  // Conditional skill multipliers (单骑救主, 拖刀计)
  baseDmg *= getConditionalSkillMultiplier(skill, allyFainted, enemySwitched);

  // Crit
  let critRate = 0.05 + extraCritRate + getPassiveCritBonus(attacker);
  const crit = Math.random() < critRate;
  let critMult = 1.5;
  if (crit && (atkDef.passive.id === 'p_wusheng' || atkDef.passive.id === 'p_wushuang')) {
    critMult = 2.0;
  }
  if (crit) baseDmg *= critMult;

  // Random variance
  baseDmg *= randomFloat(0.9, 1.1);

  // Burn penalty
  if (isPhysical && attacker.status?.type === 'burn') {
    baseDmg *= 0.75;
  }

  // Passive: 赤壁之焰 — +25% vs burned
  if (!isPhysical && atkDef.passive.id === 'p_chibi' && defender.status?.type === 'burn') {
    baseDmg *= 1.25;
  }

  const effectiveness: DamageResult['effectiveness'] =
    weaponMult > 1 ? 'super' : weaponMult < 1 ? 'resist' : 'normal';

  return {
    damage: Math.max(1, Math.floor(baseDmg)),
    crit,
    effectiveness,
  };
}

// ===== Multi-Hit Resolution =====

export function getHitCount(skill: SkillDef): number {
  for (const eff of skill.effects) {
    const val = eff.value as Record<string, unknown>;
    if ('multiHit' in val) {
      const [min, max] = val.multiHit as [number, number];
      return randomInt(min, max);
    }
  }
  return 1;
}

// ===== Accuracy Check =====

export function accuracyCheck(skill: SkillDef, accBonus = 0): boolean {
  const acc = Math.min(100, skill.accuracy + accBonus);
  return Math.random() * 100 < acc;
}

// ===== Apply Skill Effects =====

export interface EffectResult {
  actions: BattleAction[];
  attackerPatch: Partial<GeneralInstance>;
  defenderPatch: Partial<GeneralInstance>;
}

export function applySkillEffects(
  skill: SkillDef,
  attacker: GeneralInstance,
  defender: GeneralInstance,
): EffectResult {
  const actions: BattleAction[] = [];
  const attackerPatch: Partial<GeneralInstance> = {};
  const defenderPatch: Partial<GeneralInstance> = {};

  for (const eff of skill.effects) {
    if (Math.random() * 100 >= eff.chance) continue;
    const val = eff.value as Record<string, unknown>;
    const target = eff.target === 'self' ? attacker : defender;
    const patch = eff.target === 'self' ? attackerPatch : defenderPatch;
    const side = eff.target === 'self' ? 'player' : 'enemy';

    switch (eff.type) {
      case 'status': {
        const st = val as { type: string; turnsLeft: number };
        if (isStatusImmune(target, st.type)) {
          actions.push({ type: 'info', actorSide: side as 'player' | 'enemy', message: `免疫了状态效果！` });
        } else {
          patch.status = { type: st.type, turnsLeft: st.turnsLeft } as StatusCondition;
          const statusNames: Record<string, string> = { burn: '灼烧', freeze: '冰冻', poison: '中毒', confusion: '混乱', stun: '眩晕' };
          actions.push({
            type: 'status', actorSide: side as 'player' | 'enemy',
            message: `陷入了${statusNames[st.type] ?? st.type}状态！`,
          });
        }
        break;
      }
      case 'statChange': {
        const sc = val as { stat: string; stages: number };
        const key = sc.stat as keyof typeof target.statStages;
        const current = target.statStages[key];
        const newVal = Math.max(-3, Math.min(3, current + sc.stages));
        patch.statStages = { ...target.statStages, ...patch.statStages, [key]: newVal };
        const dir = sc.stages > 0 ? '提升' : '降低';
        actions.push({
          type: 'info', actorSide: side as 'player' | 'enemy',
          message: `${sc.stat.toUpperCase()} ${dir}了${Math.abs(sc.stages)}级！`,
        });
        break;
      }
      case 'heal': {
        const h = val as { percent: number };
        const healMult = getHealMultiplier(target);
        const healAmt = Math.floor(target.maxHP * h.percent / 100 * healMult);
        patch.currentHP = clampHP(target, target.currentHP + healAmt);
        actions.push({
          type: 'info', actorSide: side as 'player' | 'enemy',
          message: `恢复了${healAmt}点HP！`, heal: healAmt,
        });
        break;
      }
      case 'shield': {
        const sh = val as { percent: number };
        const shieldVal = Math.floor(target.maxHP * sh.percent / 100);
        const existing = target.specialStates.find(s => s.type === 'shield');
        const newShield: SpecialState = {
          type: 'shield', turnsLeft: 99, value: (existing?.value ?? 0) + shieldVal,
        };
        patch.specialStates = [
          ...target.specialStates.filter(s => s.type !== 'shield'),
          newShield,
        ];
        actions.push({
          type: 'info', actorSide: side as 'player' | 'enemy',
          message: `获得了${shieldVal}点护盾！`,
        });
        break;
      }
      case 'special': {
        if ('type' in val && typeof val.type === 'string') {
          const sp = val as { type: string; turnsLeft: number; value: number };
          const newState: SpecialState = { type: sp.type as SpecialState['type'], turnsLeft: sp.turnsLeft, value: sp.value };
          patch.specialStates = [
            ...target.specialStates.filter(s => s.type !== sp.type),
            newState,
          ];
          if (sp.type === 'stance') {
            actions.push({ type: 'info', actorSide: side as 'player' | 'enemy', message: '进入防御姿态！' });
          }
        }
        if ('selfDamagePercent' in val) {
          const pct = val.selfDamagePercent as number;
          const dmg = Math.floor(target.currentHP * pct / 100);
          patch.currentHP = clampHP(target, target.currentHP - dmg);
        }
        if ('clearStatus' in val || 'clearDebuffs' in val) {
          patch.status = null;
        }
        if ('energyRestore' in val) {
          const restore = val.energyRestore as number;
          patch.energy = Math.min(MAX_ENERGY, target.energy + restore);
          actions.push({ type: 'info', actorSide: side as 'player' | 'enemy', message: `恢复了${restore}点能量！` });
        }
        break;
      }
    }
  }

  return { actions, attackerPatch, defenderPatch };
}

// ===== Turn-Start Effects =====

export function processTurnStart(
  general: GeneralInstance,
): { actions: BattleAction[]; patch: Partial<GeneralInstance>; skipTurn: boolean } {
  const actions: BattleAction[] = [];
  const patch: Partial<GeneralInstance> = {};
  let skipTurn = false;
  const def = getGeneralDef(general.defId);

  // Status effects
  if (general.status) {
    switch (general.status.type) {
      case 'burn': {
        const dmg = Math.floor(general.maxHP * 0.08);
        patch.currentHP = clampHP(general, general.currentHP - dmg);
        actions.push({ type: 'status', message: `灼烧造成了${dmg}点伤害！`, damage: dmg });
        break;
      }
      case 'poison': {
        const basePct = 0.06 + 0.02 * (3 - (general.status.turnsLeft > 0 ? general.status.turnsLeft : 1));
        const dmg = Math.floor(general.maxHP * Math.min(0.16, basePct));
        patch.currentHP = clampHP(general, general.currentHP - dmg);
        actions.push({ type: 'status', message: `中毒造成了${dmg}点伤害！`, damage: dmg });
        break;
      }
      case 'freeze': {
        if (Math.random() < 0.33) {
          patch.status = null;
          actions.push({ type: 'status', message: '解冻了！' });
        } else {
          skipTurn = true;
          actions.push({ type: 'status', message: '被冰冻，无法行动！' });
        }
        break;
      }
      case 'stun': {
        skipTurn = true;
        patch.status = null;
        actions.push({ type: 'status', message: '被眩晕，跳过行动！' });
        break;
      }
      case 'confusion':
        break;
    }

    // Tick status duration
    if (general.status && !patch.status && general.status.turnsLeft > 0) {
      const newTurns = general.status.turnsLeft - 1;
      if (newTurns <= 0) {
        patch.status = null;
      } else {
        patch.status = { ...general.status, turnsLeft: newTurns };
      }
    }
  }

  // Passive: 仁德 — heal 5% each turn
  if (def.passive.id === 'p_rende') {
    const heal = Math.floor(general.maxHP * 0.05);
    const newHP = clampHP(general, (patch.currentHP ?? general.currentHP) + heal);
    patch.currentHP = newHP;
    actions.push({ type: 'info', message: `仁德恢复了${heal}点HP！`, heal });
  }

  // Tick special states
  const newStates = general.specialStates
    .map((s) => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
    .filter((s) => s.turnsLeft > 0 || s.type === 'shield');
  if (newStates.length !== general.specialStates.length) {
    patch.specialStates = newStates;
  }

  return { actions, patch, skipTurn };
}

// ===== Apply Damage (with shield + stance check) =====

export function applyDamage(
  target: GeneralInstance,
  rawDamage: number,
): { finalDamage: number; shieldAbsorbed: number; patch: Partial<GeneralInstance>; stanceTriggered: boolean } {
  const patch: Partial<GeneralInstance> = {};
  let remaining = rawDamage;
  let shieldAbsorbed = 0;
  let stanceTriggered = false;

  // Shield absorbs first
  const shield = target.specialStates.find((s) => s.type === 'shield');
  if (shield && shield.value > 0) {
    const absorbed = Math.min(shield.value, remaining);
    shieldAbsorbed = absorbed;
    remaining -= absorbed;
    const newShieldVal = shield.value - absorbed;
    if (newShieldVal <= 0) {
      patch.specialStates = target.specialStates.filter((s) => s.type !== 'shield');
    } else {
      patch.specialStates = target.specialStates.map((s) =>
        s.type === 'shield' ? { ...s, value: newShieldVal } : s,
      );
    }
  }

  // Check for stance
  const stance = target.specialStates.find((s) => s.type === 'stance');
  if (stance) {
    stanceTriggered = true;
    // Remove stance (it's consumed)
    const states = (patch.specialStates ?? target.specialStates).filter((s) => s.type !== 'stance');
    patch.specialStates = states;
  }

  patch.currentHP = clampHP(target, target.currentHP - remaining);
  return { finalDamage: remaining, shieldAbsorbed, patch, stanceTriggered };
}

// ===== Stance Trigger =====
// Returns the buff to apply when stance is triggered by being attacked.

export function resolveStance(
  target: GeneralInstance,
  stanceValue: number,
): { patch: Partial<GeneralInstance>; actions: BattleAction[] } {
  const patch: Partial<GeneralInstance> = {};
  const actions: BattleAction[] = [];

  switch (stanceValue) {
    case 1: {
      // Shield: 20% maxHP
      const shieldAmt = Math.floor(target.maxHP * 0.2);
      const existing = target.specialStates.find(s => s.type === 'shield');
      patch.specialStates = [
        ...target.specialStates.filter(s => s.type !== 'shield' && s.type !== 'stance'),
        { type: 'shield', turnsLeft: 99, value: (existing?.value ?? 0) + shieldAmt } as SpecialState,
      ];
      actions.push({ type: 'info', message: `防御姿态触发！获得${shieldAmt}点护盾！` });
      break;
    }
    case 2: {
      // DEF +1
      const cur = target.statStages.def;
      if (cur < 3) {
        patch.statStages = { ...target.statStages, def: cur + 1 };
        actions.push({ type: 'info', message: `防御姿态触发！DEF提升1级！` });
      }
      break;
    }
    case 3: {
      // ATK +1
      const cur = target.statStages.atk;
      if (cur < 3) {
        patch.statStages = { ...target.statStages, atk: cur + 1 };
        actions.push({ type: 'info', message: `防御姿态触发！ATK提升1级！` });
      }
      break;
    }
  }

  return { patch, actions };
}

// ===== Speed Comparison =====

export function getFirstActor(
  a: GeneralInstance,
  b: GeneralInstance,
  turnNumber = 1,
): 'a' | 'b' {
  let aSpd = calcEffectiveStat(getGeneralDef(a.defId), a.level, 'spd', a.statStages.spd);
  let bSpd = calcEffectiveStat(getGeneralDef(b.defId), b.level, 'spd', b.statStages.spd);

  aSpd = Math.floor(aSpd * getPassiveStatMultiplier(a, 'spd', turnNumber));
  bSpd = Math.floor(bSpd * getPassiveStatMultiplier(b, 'spd', turnNumber));

  if (aSpd !== bSpd) return aSpd > bSpd ? 'a' : 'b';
  return Math.random() < 0.5 ? 'a' : 'b';
}

// ===== Confusion Self-Hit =====

export function confusionSelfDamage(general: GeneralInstance): number {
  const def = getGeneralDef(general.defId);
  const atk = calcEffectiveStat(def, general.level, 'atk', general.statStages.atk);
  const dfs = calcEffectiveStat(def, general.level, 'def', general.statStages.def);
  return Math.max(1, Math.floor(40 * (atk / Math.max(1, dfs)) * 0.25));
}

// ===== Counter Damage =====

export function calcCounterDamage(
  target: GeneralInstance,
  incomingDamage: number,
): number {
  const counter = target.specialStates.find((s) => s.type === 'counter');
  if (!counter) return 0;
  return Math.floor(incomingDamage * counter.value / 100);
}

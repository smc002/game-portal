import type { GeneralInstance, SkillDef, BattleAction, StatusType } from '../data/types';
import { getGeneralDef } from '../data/generals';

// ===== On Switch-In =====

export function onSwitchIn(
  general: GeneralInstance,
  opponent: GeneralInstance,
): { selfPatch: Partial<GeneralInstance>; opponentPatch: Partial<GeneralInstance>; actions: BattleAction[] } {
  const def = getGeneralDef(general.defId);
  const selfPatch: Partial<GeneralInstance> = {};
  const opponentPatch: Partial<GeneralInstance> = {};
  const actions: BattleAction[] = [];

  switch (def.passive.id) {
    case 'p_jianxiong': {
      const stats = ['atk', 'def', 'int', 'res', 'spd'] as const;
      const stat = stats[Math.floor(Math.random() * stats.length)]!;
      const cur = opponent.statStages[stat];
      opponentPatch.statStages = { ...opponent.statStages, [stat]: Math.max(-3, cur - 1) };
      actions.push({ type: 'info', message: `曹操·奸雄：降低了对方${stat.toUpperCase()} 1级！` });
      break;
    }
    case 'p_baohou': {
      if (Math.random() < 0.3 && !opponent.status) {
        opponentPatch.status = { type: 'stun', turnsLeft: 1 };
        actions.push({ type: 'status', message: `张飞·暴吼：对方被吓得眩晕了！` });
      }
      break;
    }
    case 'p_qiaob': {
      const cur = general.statStages.def;
      selfPatch.statStages = { ...general.statStages, def: Math.min(3, cur + 1) };
      actions.push({ type: 'info', message: `张郃·巧变：DEF提升了1级！` });
      break;
    }
  }

  return { selfPatch, opponentPatch, actions };
}

// ===== Stat Modifiers =====

export function getPassiveStatMultiplier(
  general: GeneralInstance,
  stat: string,
  turnNumber: number,
): number {
  const def = getGeneralDef(general.defId);
  let mult = 1.0;

  switch (def.passive.id) {
    case 'p_huguo':
      if (stat === 'def') mult *= 1.15;
      break;
    case 'p_yanzheng':
      if (stat === 'def') mult *= 1.10;
      break;
    case 'p_baonue':
      if (stat === 'atk' && general.currentHP < general.maxHP * 0.5) mult *= 1.5;
      break;
    case 'p_fangu':
      if (stat === 'atk' && general.currentHP < general.maxHP * 0.4) mult *= 1.4;
      break;
    case 'p_xiliang':
      if (stat === 'atk' && turnNumber === 1) mult *= 1.3;
      break;
    case 'p_weizhen':
      if (stat === 'spd' && turnNumber === 1) mult *= 2.0;
      break;
    case 'p_hunshenshidan':
      if (stat === 'spd' && general.currentHP < general.maxHP * 0.3) mult *= 1.5;
      break;
    case 'p_shuijun':
      if (stat === 'spd') mult *= 1.1; // flat 10% SPD boost (simplified from weather-dependent)
      break;
  }

  return mult;
}

// ===== Crit Rate Modifier =====

export function getPassiveCritBonus(general: GeneralInstance): number {
  const def = getGeneralDef(general.defId);
  switch (def.passive.id) {
    case 'p_bawang': return 0.15;
    case 'p_baifa': return 0.20;
    case 'p_wushuang': return 0.20;
    default: return 0;
  }
}

// ===== On Damage Taken =====

export function onDamageTaken(
  defender: GeneralInstance,
  _attacker: GeneralInstance,
  damage: number,
  skillType: string,
): { defenderPatch: Partial<GeneralInstance>; attackerPatch: Partial<GeneralInstance>; actions: BattleAction[]; reflectDamage: number } {
  const def = getGeneralDef(defender.defId);
  const defenderPatch: Partial<GeneralInstance> = {};
  const attackerPatch: Partial<GeneralInstance> = {};
  const actions: BattleAction[] = [];
  let reflectDamage = 0;

  switch (def.passive.id) {
    case 'p_ewei': {
      if (skillType === 'martial') {
        reflectDamage = Math.floor(damage * 0.10);
        if (reflectDamage > 0) {
          actions.push({ type: 'info', message: `典韦·恶来：反弹了${reflectDamage}点伤害！`, damage: reflectDamage });
        }
      }
      break;
    }
    case 'p_kusheng': {
      const cur = defender.statStages.atk;
      if (cur < 3) {
        defenderPatch.statStages = { ...defender.statStages, atk: cur + 1 };
        actions.push({ type: 'info', message: `黄盖·苦肉：ATK提升了1级！` });
      }
      break;
    }
    case 'p_yinren': {
      const cur = defender.statStages.int;
      if (cur < 3) {
        defenderPatch.statStages = { ...defender.statStages, int: cur + 1 };
        actions.push({ type: 'info', message: `司马懿·隐忍：INT提升了1级！` });
      }
      break;
    }
  }

  return { defenderPatch, attackerPatch, actions, reflectDamage };
}

// ===== On Skill Used =====

export function onSkillUsed(
  attacker: GeneralInstance,
  skill: SkillDef,
): { extraBurnChance: number; extraDefDown: number } {
  const def = getGeneralDef(attacker.defId);
  let extraBurnChance = 0;
  let extraDefDown = 0;

  switch (def.passive.id) {
    case 'p_huoji':
      if (skill.type === 'strategy') extraBurnChance = 20; // changed from fire-only to all strategy
      break;
    case 'p_fengchu':
      if (skill.type === 'strategy') extraDefDown = 1;
      break;
    case 'p_duanl':
      if (Math.random() < 0.2) extraDefDown = 1;
      break;
  }

  return { extraBurnChance, extraDefDown };
}

// ===== Heal Modifier =====

export function getHealMultiplier(general: GeneralInstance): number {
  const def = getGeneralDef(general.defId);
  if (def.passive.id === 'p_shenyi') return 1.2;
  return 1.0;
}

// ===== Status Immunity =====

export function isStatusImmune(general: GeneralInstance, statusType: string): boolean {
  const def = getGeneralDef(general.defId);
  if (def.passive.id === 'p_huoshen' && statusType === 'burn') return true;
  return false;
}

// ===== On Enemy Faint =====

export function onEnemyFaint(
  killer: GeneralInstance,
): { patch: Partial<GeneralInstance>; actions: BattleAction[] } {
  const def = getGeneralDef(killer.defId);
  const patch: Partial<GeneralInstance> = {};
  const actions: BattleAction[] = [];

  if (def.passive.id === 'p_jinfan') {
    const cur = killer.statStages.spd;
    if (cur < 3) {
      patch.statStages = { ...killer.statStages, spd: cur + 1 };
      actions.push({ type: 'info', message: `甘宁·锦帆：SPD提升了1级！` });
    }
  }

  return { patch, actions };
}

// ===== Multi-Hit Accuracy Bonus =====

export function getMultiHitAccuracyBonus(general: GeneralInstance): number {
  const def = getGeneralDef(general.defId);
  if (def.passive.id === 'p_shenjian') return 15;
  return 0;
}

// ===== Conditional Skill Power Multiplier =====

export function getConditionalSkillMultiplier(
  skill: SkillDef,
  allyFainted: boolean,
  enemySwitchedThisTurn: boolean,
): number {
  if (skill.id === 'danji_jiuzhu' && allyFainted) return 2.0;
  if (skill.id === 'tuodao_ji' && enemySwitchedThisTurn) return 2.0;
  return 1.0;
}

// ===== Boss Turn Passive (Zhang Jiao — random status instead of weather) =====

export function processBossPassive(
  general: GeneralInstance,
  turnNumber: number,
): { statusToApply: { type: StatusType; turnsLeft: number } | null; actions: BattleAction[] } {
  const def = getGeneralDef(general.defId);
  const actions: BattleAction[] = [];

  if (def.passive.id === 'p_tianbian' && turnNumber % 3 === 0) {
    const statuses: Array<{ type: StatusType; turnsLeft: number }> = [
      { type: 'burn', turnsLeft: 3 },
      { type: 'poison', turnsLeft: -1 },
      { type: 'confusion', turnsLeft: 3 },
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)]!;
    actions.push({ type: 'status', message: `张角·天变：施放了${status.type === 'burn' ? '灼烧' : status.type === 'poison' ? '中毒' : '混乱'}！` });
    return { statusToApply: status, actions };
  }

  return { statusToApply: null, actions };
}

// ===== Accuracy Bonus for Strategist passive =====

export function getAccuracyBonus(general: GeneralInstance): number {
  const def = getGeneralDef(general.defId);
  if (def.passive.id === 'p_guanxing') return 15; // 诸葛亮: strategy accuracy +15%
  return 0;
}

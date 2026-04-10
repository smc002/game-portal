import type { GeneralDef, GeneralInstance } from '../data/types';
import { MAX_STAT } from '../data/types';
import { generals } from '../data/generals';

let counter = 0;

export function createInstance(def: GeneralDef, overrides?: Partial<GeneralInstance>): GeneralInstance {
  return {
    defId: def.id,
    instanceId: `inst_${++counter}_${Date.now()}`,
    atk: def.baseAtk,
    hp: def.baseHp,
    maxHp: def.baseHp,
    level: 1,
    xp: 0,
    perk: null,
    tempAtk: 0,
    tempHp: 0,
    ...overrides,
  };
}

export function cloneInstance(inst: GeneralInstance): GeneralInstance {
  return { ...inst, instanceId: `inst_${++counter}_${Date.now()}` };
}

export function getDef(defId: string): GeneralDef | undefined {
  return generals.find((g) => g.id === defId);
}

export function getEffectiveAtk(inst: GeneralInstance): number {
  return Math.min(MAX_STAT, inst.atk + inst.tempAtk);
}

export function getEffectiveHp(inst: GeneralInstance): number {
  return inst.hp + inst.tempHp;
}

export function clampStat(value: number): number {
  return Math.min(MAX_STAT, Math.max(0, value));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Compute a level-aware ability description.
 * The static `abilityDesc` reflects Lv.1 numbers; this function scales the
 * common patterns by the given level. Safe to use on any general.
 */
export function getLeveledAbilityDesc(def: GeneralDef, level: number): string {
  if (level <= 1) return def.abilityDesc;
  let s = def.abilityDesc;

  // +N/+M  →  +(N*L)/+(M*L)
  s = s.replace(/\+(\d+)\/\+(\d+)/g, (_m, a: string, b: string) => {
    return `+${Number(a) * level}/+${Number(b) * level}`;
  });

  // +N (ATK|HP|金币|经验|经验值)  →  +(N*L) ...
  s = s.replace(/\+(\d+)\s*(ATK|HP|金币|经验值|经验)/g, (_m, n: string, unit: string) => {
    return `+${Number(n) * level} ${unit}`;
  });

  // 造成N伤害  →  造成(N*L)伤害
  s = s.replace(/造成(\d+)伤害/g, (_m, n: string) => {
    return `造成${Number(n) * level}伤害`;
  });

  // N%  →  (N*L)% (capped at 100)
  s = s.replace(/(\d+)%/g, (_m, n: string) => {
    return `${Math.min(100, Number(n) * level)}%`;
  });

  return s;
}


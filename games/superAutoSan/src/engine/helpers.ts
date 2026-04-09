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

import type {
  GeneralInstance, GeneralDef, StatKey, StarLevel,
} from '../data/types';
import { MAX_ENERGY } from '../data/types';
import { getGeneralDef } from '../data/generals';

// Star level → stat multiplier
const STAR_MULTIPLIER: Record<StarLevel, number> = {
  1: 1.0, 2: 1.12, 3: 1.25, 4: 1.4, 5: 1.5,
};

// Level → stat bonus (per level)
const LEVEL_GROWTH = 0.03; // +3% per level

export function calcMaxHP(def: GeneralDef, level: number): number {
  return Math.floor(def.baseStats.hp * STAR_MULTIPLIER[def.star] * (1 + LEVEL_GROWTH * (level - 1)));
}

export function calcEffectiveStat(
  def: GeneralDef,
  level: number,
  stat: StatKey,
  stage: number,
): number {
  if (stat === 'hp') return calcMaxHP(def, level);
  const base = def.baseStats[stat] * STAR_MULTIPLIER[def.star] * (1 + LEVEL_GROWTH * (level - 1));
  const stageMultiplier = stageToMultiplier(stage);
  return Math.floor(base * stageMultiplier);
}

export function stageToMultiplier(stage: number): number {
  const table: Record<number, number> = {
    '-3': 0.4, '-2': 0.6, '-1': 0.8, '0': 1.0,
    '1': 1.25, '2': 1.5, '3': 2.0,
  };
  return table[Math.max(-3, Math.min(3, stage))] ?? 1.0;
}

export function createInstance(defId: string, level: number): GeneralInstance {
  const def = getGeneralDef(defId);
  const maxHP = calcMaxHP(def, level);
  return {
    defId,
    level,
    exp: 0,
    currentHP: maxHP,
    maxHP,
    energy: MAX_ENERGY,
    statStages: { hp: 0, atk: 0, int: 0, def: 0, res: 0, spd: 0 },
    status: null,
    specialStates: [],
  };
}

export function getAvailableSkills(inst: GeneralInstance) {
  const def = getGeneralDef(inst.defId);
  return def.skills.filter((sk) => sk.energyCost <= inst.energy);
}

export function isAlive(inst: GeneralInstance): boolean {
  return inst.currentHP > 0;
}

export function clampHP(inst: GeneralInstance, hp: number): number {
  return Math.max(0, Math.min(inst.maxHP, Math.floor(hp)));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function expForLevel(level: number): number {
  return 20 + level * 10;
}

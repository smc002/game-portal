import { BattleUnit } from '../types';

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  shieldAbsorbed: number;
}

export function calculateDamage(
  attacker: BattleUnit,
  target: BattleUnit,
  multiplier: number,
  options: {
    ignoreDefPercent?: number;
    bonusDamagePercent?: number;
    isCrit?: boolean;
    ownedItemIds?: string[];
  } = {}
): DamageResult {
  const { ignoreDefPercent = 0, bonusDamagePercent = 0, isCrit = false } = options;

  const effectiveDef = target.def * (1 - ignoreDefPercent);
  let rawDamage = Math.max(1, attacker.atk * multiplier - effectiveDef * 0.5);

  if (bonusDamagePercent > 0) {
    rawDamage *= 1 + bonusDamagePercent;
  }

  if (isCrit) {
    rawDamage *= 2;
  }

  // 玄武甲: reduce large hits
  if (options.ownedItemIds?.includes('xuanWuJia')) {
    if (rawDamage > target.maxHp * 0.2) {
      rawDamage *= 0.7;
    }
  }

  let damage = Math.round(rawDamage);

  // Shield absorption
  let shieldAbsorbed = 0;
  const shieldEffect = target.statusEffects.find((e) => e.type === 'shield');
  if (shieldEffect) {
    shieldAbsorbed = Math.min(shieldEffect.value, damage);
    damage -= shieldAbsorbed;
    shieldEffect.value -= shieldAbsorbed;
    if (shieldEffect.value <= 0) {
      target.statusEffects = target.statusEffects.filter((e) => e !== shieldEffect);
    }
  }

  return { damage, isCrit, shieldAbsorbed };
}

export function applyDamage(target: BattleUnit, damage: number): boolean {
  target.currentHp = Math.max(0, target.currentHp - damage);
  if (target.currentHp <= 0) {
    target.isAlive = false;
    return true;
  }
  return false;
}

export function applyHealing(target: BattleUnit, amount: number, healingBonus: number = 0): number {
  const actualAmount = Math.round(amount * (1 + healingBonus));
  const healed = Math.min(actualAmount, target.maxHp - target.currentHp);
  target.currentHp += healed;
  return healed;
}

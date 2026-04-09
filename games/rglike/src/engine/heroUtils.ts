import { HeroInstance, UnitStats } from '../types';
import { getHeroDefinition } from '../data/heroes';

export function computeHeroStats(hero: HeroInstance, ownedItemIds: string[]): UnitStats {
  const def = getHeroDefinition(hero.definitionId);
  const level = hero.level;

  let hp = def.baseStats.hp + def.growth.hp * (level - 1);
  let atk = def.baseStats.atk + def.growth.atk * (level - 1);
  let defStat = def.baseStats.def + def.growth.def * (level - 1);
  let spd = def.baseStats.spd + def.growth.spd * (level - 1);

  // Item bonuses
  if (ownedItemIds.includes('fangTianHuaJi')) atk = Math.round(atk * 1.15);
  if (ownedItemIds.includes('renWangDun')) defStat = Math.round(defStat * 1.2);
  if (ownedItemIds.includes('diLuMa')) spd = Math.round(spd * 1.15);

  return { hp, atk, def: defStat, spd };
}

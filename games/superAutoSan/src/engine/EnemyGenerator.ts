import type { GeneralInstance } from '../data/types';
import { generals } from '../data/generals';
import { waveConfigs } from '../data/enemyWaves';
import { createInstance, randomInt, randomPick } from './helpers';
import { getSimulatedEnemy } from './SimulateGame';

export function generateEnemy(wave: number): GeneralInstance[] {
  // Try simulated enemy first (more realistic difficulty)
  const simulated = getSimulatedEnemy(wave);
  if (simulated && simulated.length > 0) {
    return simulated;
  }

  // Fallback: random generation from wave config
  const config = waveConfigs.find(
    (c) => wave >= c.waveRange[0] && wave <= c.waveRange[1]
  ) ?? waveConfigs[waveConfigs.length - 1]!;

  const count = randomInt(config.petCount[0], config.petCount[1]);
  const pool = generals.filter(
    (g) => g.tier >= config.tierRange[0] && g.tier <= config.tierRange[1]
  );

  const team: GeneralInstance[] = [];

  for (let i = 0; i < count; i++) {
    const def = randomPick(pool);
    if (!def) continue;

    const inst = createInstance(def);

    const roll = Math.random();
    if (roll < config.levelChance.lv3 && config.maxLevel >= 3) {
      inst.level = 3;
      inst.atk += 2;
      inst.hp += 2;
      inst.maxHp += 2;
    } else if (roll < config.levelChance.lv3 + config.levelChance.lv2 && config.maxLevel >= 2) {
      inst.level = 2;
      inst.atk += 1;
      inst.hp += 1;
      inst.maxHp += 1;
    }

    if (Math.random() < config.perkChance && config.availablePerks.length > 0) {
      inst.perk = randomPick(config.availablePerks) ?? null;
    }

    const bonus = Math.max(0, wave - 15);
    if (bonus > 0) {
      inst.atk += bonus;
      inst.hp += bonus;
      inst.maxHp += bonus;
    }

    team.push(inst);
  }

  return team;
}

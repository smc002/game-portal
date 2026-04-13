import type { GeneralInstance } from '../data/types';
import { generals } from '../data/generals';
import { waveConfigs } from '../data/enemyWaves';
import { createInstance, randomInt, randomPick } from './helpers';
import { getSimulatedEnemy } from './SimulateGame';
import { getArenaTeam } from './ArenaStore';

/** Tracks arena savedAt of the last generated enemy (if from arena) */
let lastArenaSavedAt: number | undefined;

export function getLastArenaSavedAt(): number | undefined {
  return lastArenaSavedAt;
}

// Endless mode (wave 16+): aggressive scaling so wave 20 is brutal
// wave 16: +6, 17: +14, 18: +24, 19: +36, 20: +50
function endlessBonus(wave: number): number {
  const d = Math.max(0, wave - 15);
  return d > 0 ? d * 5 + d * d : 0;
}

function applyEndlessBonus(team: GeneralInstance[], wave: number): void {
  const bonus = endlessBonus(wave);
  if (bonus <= 0) return;
  for (const t of team) {
    t.atk += bonus;
    t.hp += bonus;
    t.maxHp += bonus;
  }
}

export function generateEnemy(wave: number): GeneralInstance[] {
  lastArenaSavedAt = undefined;

  // Mix arena (player teams) and simulation for variety
  // 50% chance arena, 50% chance simulation; fallback to random if both miss
  const tryArenaFirst = Math.random() < 0.5;

  if (tryArenaFirst) {
    const arena = getArenaTeam(wave);
    if (arena && arena.team.length > 0) {
      lastArenaSavedAt = arena.savedAt;
      applyEndlessBonus(arena.team, wave);
      return arena.team;
    }
  }

  // Try simulated enemy
  const simulated = getSimulatedEnemy(wave);
  if (simulated && simulated.length > 0) {
    applyEndlessBonus(simulated, wave);
    return simulated;
  }

  // If simulation missed, try arena as fallback
  if (!tryArenaFirst) {
    const arena = getArenaTeam(wave);
    if (arena && arena.team.length > 0) {
      lastArenaSavedAt = arena.savedAt;
      applyEndlessBonus(arena.team, wave);
      return arena.team;
    }
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

    const bonus = endlessBonus(wave);
    if (bonus > 0) {
      inst.atk += bonus;
      inst.hp += bonus;
      inst.maxHp += bonus;
    }

    team.push(inst);
  }

  return team;
}

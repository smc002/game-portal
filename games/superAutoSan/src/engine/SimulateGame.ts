/**
 * Simulates a "player" buying from the shop each turn to generate realistic
 * enemy team snapshots. Called at startup to build an enemy pool.
 */
import type { GeneralDef, GeneralInstance } from '../data/types';
import { generals } from '../data/generals';
import { items } from '../data/items';
import { TIER_UNLOCK, GOLD_PER_TURN, PET_COST, ROLL_COST, MAX_TEAM_SIZE, MAX_STAT, XP_TO_LV2, XP_TO_LV3 } from '../data/types';

function randomPick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPicks<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getTier(turn: number): number {
  let tier = 1;
  for (const [t, v] of Object.entries(TIER_UNLOCK)) {
    if (turn >= Number(t)) tier = v;
  }
  return tier;
}

let counter = 0;
function makeInst(def: GeneralDef): GeneralInstance {
  return {
    defId: def.id,
    instanceId: `sim_${++counter}`,
    atk: def.baseAtk,
    hp: def.baseHp,
    maxHp: def.baseHp,
    level: 1,
    xp: 0,
    perk: null,
    tempAtk: 0,
    tempHp: 0,
  };
}

/**
 * Simulate one game for `maxTurns` turns, returning team snapshot per turn.
 */
function simulateOneGame(maxTurns: number): GeneralInstance[][] {
  const snapshots: GeneralInstance[][] = [];
  let team: GeneralInstance[] = [];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const tier = getTier(turn);
    let gold = GOLD_PER_TURN;
    const pool = generals.filter((g) => g.tier <= tier);
    const itemPool = items.filter((i) => i.tier <= tier);

    // Generate shop
    let shop = randomPicks(pool, 5);

    // Strategy: buy pets that merge or fill slots, spend remaining on rolls/items
    // Phase 1: Try to merge existing pets
    for (const def of shop) {
      if (gold < PET_COST) break;
      const mergeTarget = team.find((t) => t.defId === def.id && t.level < 3);
      if (mergeTarget) {
        gold -= PET_COST;
        mergeTarget.atk = Math.min(MAX_STAT, mergeTarget.atk + 1);
        mergeTarget.hp = Math.min(MAX_STAT, mergeTarget.hp + 1);
        mergeTarget.maxHp = Math.min(MAX_STAT, mergeTarget.maxHp + 1);
        mergeTarget.xp += 1;
        if (mergeTarget.level === 1 && mergeTarget.xp >= XP_TO_LV2) mergeTarget.level = 2;
        else if (mergeTarget.level === 2 && mergeTarget.xp >= XP_TO_LV3) mergeTarget.level = 3;
        shop = shop.filter((s) => s !== def);
      }
    }

    // Phase 2: Buy new pets for empty slots
    for (const def of shop) {
      if (gold < PET_COST || team.length >= MAX_TEAM_SIZE) break;
      // Prefer higher tier pets
      gold -= PET_COST;
      team.push(makeInst(def));
      shop = shop.filter((s) => s !== def);
    }

    // Phase 3: If still have gold, roll and buy
    while (gold >= ROLL_COST + PET_COST && team.length < MAX_TEAM_SIZE) {
      gold -= ROLL_COST;
      const newShop = randomPicks(pool, 3);
      const pick = newShop[0];
      if (pick && gold >= PET_COST) {
        const mergeTarget = team.find((t) => t.defId === pick.id && t.level < 3);
        if (mergeTarget) {
          gold -= PET_COST;
          mergeTarget.atk = Math.min(MAX_STAT, mergeTarget.atk + 1);
          mergeTarget.hp = Math.min(MAX_STAT, mergeTarget.hp + 1);
          mergeTarget.maxHp = Math.min(MAX_STAT, mergeTarget.maxHp + 1);
          mergeTarget.xp += 1;
          if (mergeTarget.level === 1 && mergeTarget.xp >= XP_TO_LV2) mergeTarget.level = 2;
          else if (mergeTarget.level === 2 && mergeTarget.xp >= XP_TO_LV3) mergeTarget.level = 3;
        } else if (team.length < MAX_TEAM_SIZE) {
          gold -= PET_COST;
          team.push(makeInst(pick));
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Phase 4: Use remaining gold on items (simplified: just add stats)
    while (gold >= 3 && team.length > 0) {
      const item = randomPick(itemPool.filter((i) => i.type === 'stat'));
      if (!item) break;
      gold -= 3;
      const target = randomPick(team);
      if (target) {
        const boost = item.id === 'xiantao' ? 2 : item.id === 'yuyan' ? 2 : 1;
        target.atk = Math.min(MAX_STAT, target.atk + boost);
        target.hp = Math.min(MAX_STAT, target.hp + boost);
        target.maxHp = Math.min(MAX_STAT, target.maxHp + boost);
      }
    }

    // Phase 5: Sell weakest if team is full and we have weak T1 units late game
    if (team.length >= MAX_TEAM_SIZE && tier >= 3) {
      const weakest = team.reduce((a, b) => {
        const aDef = generals.find((g) => g.id === a.defId);
        const bDef = generals.find((g) => g.id === b.defId);
        const aScore = (aDef?.tier ?? 1) * 10 + a.level * 5 + a.atk + a.hp;
        const bScore = (bDef?.tier ?? 1) * 10 + b.level * 5 + b.atk + b.hp;
        return aScore < bScore ? a : b;
      });
      const weakDef = generals.find((g) => g.id === weakest.defId);
      if (weakDef && weakDef.tier < tier - 1 && weakest.level === 1) {
        team = team.filter((t) => t !== weakest);
      }
    }

    // Assign random perks to some units in later turns
    if (tier >= 3) {
      for (const t of team) {
        if (!t.perk && Math.random() < 0.15 * (tier - 2)) {
          const perkPool = items.filter((i) => i.type === 'perk' && i.tier <= tier);
          const perk = randomPick(perkPool);
          if (perk) t.perk = perk.id;
        }
      }
    }

    // Save deep copy snapshot
    snapshots.push(JSON.parse(JSON.stringify(team)));
  }

  return snapshots;
}

// Pre-generated enemy pool: run multiple simulations
let enemyPool: GeneralInstance[][][] | null = null;

function getEnemyPool(): GeneralInstance[][][] {
  if (!enemyPool) {
    const NUM_SIMS = 8;
    const MAX_TURNS = 35;
    enemyPool = [];
    for (let i = 0; i < NUM_SIMS; i++) {
      enemyPool.push(simulateOneGame(MAX_TURNS));
    }
  }
  return enemyPool;
}

/**
 * Get a simulated enemy team for the given wave.
 * Falls back to random generation if no simulation data available.
 */
export function getSimulatedEnemy(wave: number): GeneralInstance[] | null {
  const pool = getEnemyPool();
  const turnIdx = wave - 1; // wave 1 = turn index 0

  // Collect all snapshots for this turn across simulations
  const candidates: GeneralInstance[][] = [];
  for (const sim of pool) {
    if (turnIdx < sim.length && sim[turnIdx]!.length > 0) {
      candidates.push(sim[turnIdx]!);
    }
  }

  if (candidates.length === 0) return null;

  // Pick a random candidate
  const picked = candidates[Math.floor(Math.random() * candidates.length)]!;

  // Deep copy and reassign instanceIds
  const team: GeneralInstance[] = JSON.parse(JSON.stringify(picked));
  for (const t of team) {
    t.instanceId = `enemy_sim_${++counter}_${Date.now()}`;
    t.tempAtk = 0;
    t.tempHp = 0;
  }

  // Endless bonus is applied centrally in EnemyGenerator
  return team;
}

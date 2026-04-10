/**
 * 自动模拟玩家游戏，把表现最好的阵容保存到 src/engine/seedArena.ts。
 *
 * 用法：
 *   cd games/superAutoSan
 *   npx tsx scripts/playGames.ts
 */
import { generals } from '../src/data/generals';
import { items } from '../src/data/items';
import {
  TIER_UNLOCK,
  GOLD_PER_TURN,
  PET_COST,
  ROLL_COST,
  MAX_TEAM_SIZE,
  MAX_STAT,
  XP_TO_LV2,
  XP_TO_LV3,
} from '../src/data/types';
import type { GeneralDef, GeneralInstance, ItemDef } from '../src/data/types';
import { executeBattle } from '../src/engine/BattleEngine';
import { generateEnemy } from '../src/engine/EnemyGenerator';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function randomPick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomPicks<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
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

function teamPower(team: GeneralInstance[]): number {
  return team.reduce((sum, t) => sum + (t.atk + t.tempAtk) + (t.hp + t.tempHp) + t.level * 3, 0);
}

function applyMerge(target: GeneralInstance) {
  if (target.level === 1 && target.xp >= XP_TO_LV2) target.level = 2;
  else if (target.level === 2 && target.xp >= XP_TO_LV3) target.level = 3;
}

function findStrongest(team: GeneralInstance[]): GeneralInstance | undefined {
  return team.reduce<GeneralInstance | undefined>((best, t) => {
    if (!best) return t;
    return t.atk + t.hp > best.atk + best.hp ? t : best;
  }, undefined);
}

function findFrontTank(team: GeneralInstance[]): GeneralInstance | undefined {
  return team.reduce<GeneralInstance | undefined>((best, t) => {
    if (!best) return t;
    return t.hp > best.hp ? t : best;
  }, undefined);
}

/**
 * Simulate one shop turn with stronger AI:
 * - aggressively merge same-name pets
 * - reroll until 0 gold or team is full
 * - prioritize high-tier additions
 * - equip perks on tank, food on attacker
 * - use 酒 right before strong-power battles
 */
function simulateShopTurn(team: GeneralInstance[], turn: number): void {
  const tier = getTier(turn);
  let gold = GOLD_PER_TURN;
  const petPool = generals.filter((g) => g.tier <= tier);
  const itemPool = items.filter((i) => i.tier <= tier);

  // Try multiple rolls
  let rolls = 0;
  const maxRolls = 5;
  while (rolls < maxRolls && gold >= PET_COST) {
    rolls++;
    const shop = randomPicks(petPool, 5);
    let didSomething = false;

    // Phase 1: merge existing
    for (const def of shop) {
      if (gold < PET_COST) break;
      const mergeTarget = team.find((t) => t.defId === def.id && t.level < 3);
      if (mergeTarget) {
        gold -= PET_COST;
        mergeTarget.atk = Math.min(MAX_STAT, mergeTarget.atk + 1);
        mergeTarget.hp = Math.min(MAX_STAT, mergeTarget.hp + 1);
        mergeTarget.maxHp = Math.min(MAX_STAT, mergeTarget.maxHp + 1);
        mergeTarget.xp += 1;
        applyMerge(mergeTarget);
        didSomething = true;
      }
    }

    // Phase 2: fill empty slots, prefer high tier
    if (team.length < MAX_TEAM_SIZE) {
      const sortedShop = [...shop].sort((a, b) => b.tier - a.tier || (b.baseAtk + b.baseHp) - (a.baseAtk + a.baseHp));
      for (const def of sortedShop) {
        if (gold < PET_COST || team.length >= MAX_TEAM_SIZE) break;
        gold -= PET_COST;
        team.push(makeInst(def));
        didSomething = true;
      }
    }

    // Reroll if still have gold and team isn't merging well
    if (!didSomething || gold < ROLL_COST + PET_COST) break;
    if (rolls < maxRolls) gold -= ROLL_COST;
  }

  // Late-game: sell weak T1 if team full
  if (team.length >= MAX_TEAM_SIZE && tier >= 4) {
    const sortedByPower = [...team].sort((a, b) => {
      const aDef = generals.find((g) => g.id === a.defId)!;
      const bDef = generals.find((g) => g.id === b.defId)!;
      return aDef.tier - bDef.tier || a.atk + a.hp - (b.atk + b.hp);
    });
    const weakest = sortedByPower[0]!;
    const weakDef = generals.find((g) => g.id === weakest.defId)!;
    if (weakDef.tier < tier - 1 && weakest.level === 1) {
      const idx = team.indexOf(weakest);
      team.splice(idx, 1);
    }
  }

  // Phase 3: buy items strategically
  const itemShop = randomPicks(itemPool, 3);
  for (const item of itemShop) {
    if (gold < item.cost || team.length === 0) break;
    if (item.type === 'perk') {
      // Equip on the front tank if no perk yet
      const tank = findFrontTank(team.filter((t) => !t.perk));
      if (tank) {
        gold -= item.cost;
        tank.perk = item.id;
      }
    } else if (item.type === 'stat') {
      const target = findStrongest(team)!;
      gold -= item.cost;
      if (item.id === 'jiu') {
        // Save 酒 for last - apply temp +3/+3 to strongest
        target.tempAtk += 3;
        target.tempHp += 3;
      } else if (item.id === 'mantou') {
        target.atk = Math.min(MAX_STAT, target.atk + 1);
        target.hp = Math.min(MAX_STAT, target.hp + 1);
        target.maxHp = Math.min(MAX_STAT, target.maxHp + 1);
      } else if (item.id === 'xiantao') {
        target.atk = Math.min(MAX_STAT, target.atk + 2);
        target.hp = Math.min(MAX_STAT, target.hp + 2);
        target.maxHp = Math.min(MAX_STAT, target.maxHp + 2);
      } else if (item.id === 'junliang' || item.id === 'yushan' || item.id === 'yuyan') {
        // Multi-target stat
        const boost = item.id === 'yuyan' ? 2 : 1;
        const count = item.id === 'yushan' ? 3 : 2;
        const targets = randomPicks(team, count);
        for (const t of targets) {
          t.atk = Math.min(MAX_STAT, t.atk + boost);
          t.hp = Math.min(MAX_STAT, t.hp + boost);
          t.maxHp = Math.min(MAX_STAT, t.maxHp + boost);
        }
      }
    } else if (item.type === 'special') {
      if (item.id === 'bingshu') {
        gold -= item.cost; // canned food, applies to future shop pets
      }
      // skip 安眠药 / 兵法 — too situational for AI
    }
  }
}

interface GameRun {
  // Best winning team snapshot per wave level
  snapshotsByWave: Map<number, GeneralInstance[]>;
  finalTeam: GeneralInstance[];
  turnsCleared: number;
  power: number;
}

function simulateOneGame(maxTurns: number): GameRun {
  let team: GeneralInstance[] = [];
  let lives = 5;
  let turnsCleared = 0;
  const snapshotsByWave = new Map<number, GeneralInstance[]>();

  for (let turn = 1; turn <= maxTurns && lives > 0; turn++) {
    // Strip last turn's temp buffs at start of new turn (matches game behavior)
    for (const t of team) {
      t.tempAtk = 0;
      t.tempHp = 0;
    }
    simulateShopTurn(team, turn);
    if (team.length === 0) continue;

    // Snapshot the team BEFORE battle (with all temp buffs)
    const preBattleSnapshot: GeneralInstance[] = JSON.parse(JSON.stringify(team));

    // Battle against generated enemy
    const enemy = generateEnemy(turn);
    const teamCopy = JSON.parse(JSON.stringify(team)) as GeneralInstance[];
    const result = executeBattle(teamCopy, enemy);
    if (result.result === 'win') {
      turnsCleared++;
      // Save snapshot of winning team for this wave
      snapshotsByWave.set(turn, preBattleSnapshot);
    } else if (result.result === 'lose') {
      lives--;
    }
    // Restore HP between rounds
    for (const t of team) {
      t.hp = t.maxHp;
    }
  }

  return { snapshotsByWave, finalTeam: team, turnsCleared, power: teamPower(team) };
}

// === Main ===
function main() {
  const NUM_GAMES = 5;
  const MAX_TURNS = 15; // 正常模式 1-15 关
  const runs: GameRun[] = [];

  console.log(`正在模拟 ${NUM_GAMES} 局游戏，每局最多 ${MAX_TURNS} 回合...\n`);

  for (let i = 0; i < NUM_GAMES; i++) {
    const run = simulateOneGame(MAX_TURNS);
    runs.push(run);
    console.log(
      `第 ${i + 1} 局：通关 ${run.turnsCleared}/${MAX_TURNS} 关，` +
      `最终阵容力量 ${run.power}\n` +
      `  最终阵容: ${run.finalTeam.map((t) => {
        const def = generals.find((g) => g.id === t.defId)!;
        const perkLabel = t.perk ? `+${items.find((i) => i.id === t.perk)?.name ?? t.perk}` : '';
        return `${def.name}(L${t.level} ${t.atk + t.tempAtk}/${t.hp + t.tempHp}${perkLabel})`;
      }).join(', ')}`
    );
  }

  // Build arena seed: gather all winning snapshots from all 5 games, by wave
  type ArenaEntry = { team: GeneralInstance[]; savedAt: number; comment: string };
  const arenaSeed: Record<number, ArenaEntry[]> = {};

  let entryCounter = 0;
  for (let gameIdx = 0; gameIdx < runs.length; gameIdx++) {
    const run = runs[gameIdx]!;
    for (const [wave, snapshot] of run.snapshotsByWave) {
      if (!arenaSeed[wave]) arenaSeed[wave] = [];
      arenaSeed[wave].push({
        team: snapshot,
        savedAt: Date.now() - entryCounter * 60_000, // staggered, "几分钟前"
        comment: `模拟玩家 #${gameIdx + 1}，关卡 ${wave}`,
      });
      entryCounter++;
    }
  }

  // Output as TypeScript file
  const outPath = resolve(__dirname, '../src/engine/seedArena.ts');
  const seedJson = JSON.stringify(arenaSeed, null, 2);
  const fileContent = `/**
 * Auto-generated seed data for the PVE arena.
 * Produced by scripts/playGames.ts on ${new Date().toISOString()}.
 *
 * Loaded by ArenaStore on first run when localStorage is empty.
 */
import type { GeneralInstance } from '../data/types';

export interface SeededArenaEntry {
  team: GeneralInstance[];
  savedAt: number;
  comment?: string;
}

export const SEED_ARENA: Record<number, SeededArenaEntry[]> = ${seedJson};
`;
  writeFileSync(outPath, fileContent, 'utf-8');
  console.log(`\n已写入 ${outPath}`);
  console.log(`阵容种子分布：`);
  const waves = Object.keys(arenaSeed).map(Number).sort((a, b) => a - b);
  for (const wave of waves) {
    console.log(`  关卡 ${wave}: ${arenaSeed[wave]!.length} 套阵容`);
  }
  console.log(`\n总共 ${entryCounter} 套阵容写入种子`);
}

main();

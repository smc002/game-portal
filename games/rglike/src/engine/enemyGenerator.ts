import { BattleUnit, Difficulty } from '../types';
import { ENEMY_TEMPLATES, getBossForRound } from '../data/enemies';
import { pickRandom, randomInt } from '../utils/random';
import {
  ENEMY_SCALE_PER_ROUND,
  HARD_STAT_MULTIPLIER,
  BOSS_STAT_MULTIPLIER,
  EASY_ENEMY_MIN,
  EASY_ENEMY_MAX,
  HARD_ENEMY_MIN,
  HARD_ENEMY_MAX,
  GOLD_EASY_MIN,
  GOLD_EASY_MAX,
  GOLD_HARD_MIN,
  GOLD_HARD_MAX,
  GOLD_BOSS_EASY_BONUS,
  GOLD_BOSS_HARD_BONUS,
} from '../utils/constants';
import { isBossRound } from '../data/rounds';

function scaleStats(base: number, round: number, difficulty: Difficulty, isBoss: boolean): number {
  let val = base * (1 + (round - 1) * ENEMY_SCALE_PER_ROUND);
  if (difficulty === 'hard') val *= HARD_STAT_MULTIPLIER;
  if (isBoss) val *= BOSS_STAT_MULTIPLIER;
  return Math.round(val);
}

/** A lightweight preview of what enemies will appear, generated before the battle */
export interface EnemyPreview {
  entries: Array<{ name: string; count: number }>;
  gold: number;
  isBoss: boolean;
  bossName?: string;
}

/** Pre-roll enemy composition and gold for both difficulties. Call once per round. */
export function generateEnemyPreviews(round: number): { easy: EnemyPreview; hard: EnemyPreview } {
  return {
    easy: rollPreview(round, 'easy'),
    hard: rollPreview(round, 'hard'),
  };
}

function rollPreview(round: number, difficulty: Difficulty): EnemyPreview {
  const isBoss = isBossRound(round);

  // Gold
  const isHard = difficulty === 'hard';
  let gold = isHard
    ? randomInt(GOLD_HARD_MIN, GOLD_HARD_MAX)
    : randomInt(GOLD_EASY_MIN, GOLD_EASY_MAX);
  if (isBoss) {
    gold += isHard ? GOLD_BOSS_HARD_BONUS : GOLD_BOSS_EASY_BONUS;
  }

  // Enemy composition
  const minCount = isBoss ? 0 : (isHard ? HARD_ENEMY_MIN : EASY_ENEMY_MIN);
  const maxCount = isBoss ? (isHard ? 2 : 1) : (isHard ? HARD_ENEMY_MAX : EASY_ENEMY_MAX);
  const count = randomInt(minCount, maxCount);

  const templates = isBoss
    ? ENEMY_TEMPLATES.filter((t) => t.type !== 'elite')
    : ENEMY_TEMPLATES;

  // Pick which template each enemy uses
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(pickRandom(templates, 1)[0].name);
  }

  // Aggregate into name → count
  const countMap = new Map<string, number>();
  for (const name of picked) {
    countMap.set(name, (countMap.get(name) || 0) + 1);
  }
  const entries = Array.from(countMap.entries()).map(([name, c]) => ({ name, count: c }));

  let bossName: string | undefined;
  if (isBoss) {
    bossName = getBossForRound(round).name;
  }

  return { entries, gold, isBoss, bossName };
}

/** Build full BattleUnit[] from a preview (same composition, just add stats) */
export function generateEnemiesFromPreview(
  round: number,
  difficulty: Difficulty,
  preview: EnemyPreview
): BattleUnit[] {
  const units: BattleUnit[] = [];

  if (preview.isBoss) {
    const boss = getBossForRound(round);
    units.push({
      id: `enemy_boss_${round}`,
      name: boss.name,
      side: 'enemy',
      role: 'boss',
      currentHp: scaleStats(boss.baseStats.hp, round, difficulty, true),
      maxHp: scaleStats(boss.baseStats.hp, round, difficulty, true),
      atk: scaleStats(boss.baseStats.atk, round, difficulty, true),
      def: scaleStats(boss.baseStats.def, round, difficulty, true),
      spd: scaleStats(boss.baseStats.spd, round, difficulty, true),
      actionBar: 0,
      statusEffects: [],
      isAlive: true,
      passiveState: {},
      isBoss: true,
      bossPhase: 1,
      bossPhaseThreshold: boss.bossPhaseThreshold,
    });
  }

  let idx = 0;
  for (const entry of preview.entries) {
    const template = ENEMY_TEMPLATES.find((t) => t.name === entry.name)!;
    for (let i = 0; i < entry.count; i++) {
      const totalNormals = preview.entries.reduce((s, e) => s + e.count, 0);
      units.push({
        id: `enemy_${round}_${idx}`,
        name: `${template.name}${totalNormals > 1 ? String.fromCharCode(65 + idx) : ''}`,
        side: 'enemy',
        role: template.type,
        currentHp: scaleStats(template.baseStats.hp, round, difficulty, false),
        maxHp: scaleStats(template.baseStats.hp, round, difficulty, false),
        atk: scaleStats(template.baseStats.atk, round, difficulty, false),
        def: scaleStats(template.baseStats.def, round, difficulty, false),
        spd: scaleStats(template.baseStats.spd, round, difficulty, false),
        actionBar: 0,
        statusEffects: [],
        isAlive: true,
        passiveState: {},
      });
      idx++;
    }
  }

  return units;
}

// Keep old API for backwards compat (used by useBattleSimulation)
export function generateEnemies(round: number, difficulty: Difficulty): BattleUnit[] {
  const preview = rollPreview(round, difficulty);
  return generateEnemiesFromPreview(round, difficulty, preview);
}

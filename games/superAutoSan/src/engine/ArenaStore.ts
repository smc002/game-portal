/**
 * PVE Arena: stores winning player teams per wave in localStorage.
 * Up to 20 teams per wave. When full, the winner replaces the defeated team.
 */
import type { GeneralInstance } from '../data/types';
import { SEED_ARENA } from './seedArena';

const STORAGE_KEY = 'superAutoSan_arena';
const SEEDED_FLAG_KEY = 'superAutoSan_arena_seeded';
const MAX_TEAMS_PER_WAVE = 20;

interface ArenaEntry {
  team: GeneralInstance[];
  savedAt: number; // Date.now() when stored
}

type ArenaData = Record<number, ArenaEntry[]>;
// Legacy format for backward compatibility: Record<number, GeneralInstance[][]>
type LegacyData = Record<number, GeneralInstance[][]>;

function seedFromBundle(): ArenaData {
  const result: ArenaData = {};
  for (const [waveStr, entries] of Object.entries(SEED_ARENA)) {
    const wave = Number(waveStr);
    result[wave] = entries.map((e) => ({ team: e.team, savedAt: e.savedAt }));
  }
  return result;
}

function loadArena(): ArenaData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First run: seed with bundled simulation data
      const seeded = seedFromBundle();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        localStorage.setItem(SEEDED_FLAG_KEY, '1');
      } catch { /* localStorage may be unavailable */ }
      return seeded;
    }
    const parsed = JSON.parse(raw);
    const result: ArenaData = {};
    for (const [wave, value] of Object.entries(parsed)) {
      const entries = value as unknown[];
      if (!Array.isArray(entries)) continue;
      result[Number(wave)] = entries.map((item) => {
        // New format: { team, savedAt }
        if (item && typeof item === 'object' && 'team' in item) {
          return item as ArenaEntry;
        }
        // Legacy format: bare team array — backfill with savedAt = 0
        return { team: item as GeneralInstance[], savedAt: 0 };
      });
    }
    // If existing data has no entries at all and we haven't seeded yet, seed
    const totalEntries = Object.values(result).reduce((s, arr) => s + arr.length, 0);
    if (totalEntries === 0 && !localStorage.getItem(SEEDED_FLAG_KEY)) {
      const seeded = seedFromBundle();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        localStorage.setItem(SEEDED_FLAG_KEY, '1');
      } catch { /* ignore */ }
      return seeded;
    }
    return result;
  } catch {
    return {};
  }
}

function saveArena(data: ArenaData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Pick a random arena team for the given wave.
 * Returns the team (deep-copied), the index it was picked from, and when it was saved.
 */
export function getArenaTeam(wave: number): { team: GeneralInstance[]; arenaIdx: number; savedAt: number } | null {
  const arena = loadArena();
  const entries = arena[wave];
  if (!entries || entries.length === 0) return null;

  const idx = Math.floor(Math.random() * entries.length);
  const entry = entries[idx]!;
  const team: GeneralInstance[] = JSON.parse(JSON.stringify(entry.team));

  // Reassign instanceIds so they don't clash with player units; keep temp buffs
  let counter = 0;
  for (const t of team) {
    t.instanceId = `arena_${wave}_${idx}_${++counter}_${Date.now()}`;
    t.tempAtk = t.tempAtk ?? 0;
    t.tempHp = t.tempHp ?? 0;
    // Restore HP to maxHp (stored teams should be at full HP)
    t.hp = t.maxHp;
  }

  return { team, arenaIdx: idx, savedAt: entry.savedAt };
}

/**
 * Save a player team to the arena for the given wave (regardless of win/lose).
 * If < 20 entries, append; if full, replace a random entry.
 */
export function saveArenaTeam(wave: number, team: GeneralInstance[]): void {
  const arena = loadArena();
  if (!arena[wave]) arena[wave] = [];

  // Snapshot for storage: full HP, but PRESERVE temp buffs (酒/吕布等临时增益是阵容真实强度的一部分)
  const teamCopy: GeneralInstance[] = team.map((g) => ({
    ...JSON.parse(JSON.stringify(g)),
    hp: g.maxHp,
  }));
  const entry: ArenaEntry = { team: teamCopy, savedAt: Date.now() };

  if (arena[wave].length < MAX_TEAMS_PER_WAVE) {
    arena[wave].push(entry);
  } else {
    const replaceIdx = Math.floor(Math.random() * arena[wave].length);
    arena[wave][replaceIdx] = entry;
  }

  saveArena(arena);
}

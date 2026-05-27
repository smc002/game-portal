import { BUILDING_STATS } from '../data/buildings';
import { UNITS } from '../data/units';
import type { GameState, Owner } from '../types/game';
import { addFloatingText, spawnUnitFromBarrack } from './actions';
import { updateCombat } from './combat';
import { getNextStepTowardEnemyBase } from './pathfinding';
import { ownerLabel } from './rules';

const ECONOMY_MS = 5000;
const AI_MS = 1500;
const FLOATING_LIFETIME_MS = 1700;
export const MATCH_LIMIT_MS = 180000;

export function updateGame(state: GameState, deltaMs: number, runEnemyAi: (state: GameState) => void) {
  if (state.status !== 'playing') {
    updateFloatingTexts(state, deltaMs);
    return;
  }

  state.elapsedMs += deltaMs;
  if (state.elapsedMs >= MATCH_LIMIT_MS) {
    resolveTimeout(state);
    updateFloatingTexts(state, deltaMs);
    return;
  }

  state.aiElapsedMs += deltaMs;

  updateEconomy(state, deltaMs);
  updateBarracks(state, deltaMs);
  updateUnits(state, deltaMs);
  updateCombat(state, deltaMs);
  updateAi(state, runEnemyAi);
  updateFloatingTexts(state, deltaMs);
}

function updateEconomy(state: GameState, deltaMs: number) {
  for (const building of Object.values(state.buildings)) {
    if (building.kind !== 'mine' && building.kind !== 'base') continue;
    building.goldElapsedMs += deltaMs;
    while (building.goldElapsedMs >= ECONOMY_MS) {
      building.goldElapsedMs -= ECONOMY_MS;
      state.players[building.owner].gold += BUILDING_STATS.mine.gold;
      if (building.owner === 'player') {
        state.logs.unshift(`${building.kind === 'base' ? '主城' : '金矿'}结算：+${BUILDING_STATS.mine.gold} 金币。`);
      }
    }
  }
}

function updateBarracks(state: GameState, deltaMs: number) {
  for (const building of Object.values(state.buildings)) {
    if (building.kind !== 'barrack' || !building.spawnMs) continue;
    building.spawnElapsedMs += deltaMs;
    while (building.spawnElapsedMs >= building.spawnMs) {
      building.spawnElapsedMs -= building.spawnMs;
      spawnUnitFromBarrack(state, building.id);
    }
  }
}

function updateUnits(state: GameState, deltaMs: number) {
  for (const unit of Object.values(state.units)) {
    const config = UNITS[unit.unitId];

    const hasNearbyEnemy = Object.values(state.units).some(
      (target) => target.owner !== unit.owner && (target.tileId === unit.tileId || target.tileId === unit.toTileId),
    );
    if (hasNearbyEnemy) continue;

    if (!unit.toTileId) {
      const nextTileId = getNextStepTowardEnemyBase(state, unit.owner, unit.tileId);
      if (!nextTileId) continue;
      unit.fromTileId = unit.tileId;
      unit.toTileId = nextTileId;
      unit.moveProgress = 0;
    }

    unit.moveProgress += (config.moveSpeed * deltaMs) / 1000;
    if (unit.moveProgress < 1) continue;

    const arrivedTileId = unit.toTileId;
    unit.tileId = arrivedTileId;
    unit.fromTileId = arrivedTileId;
    unit.toTileId = undefined;
    unit.moveProgress = 0;

    const tile = state.tiles[arrivedTileId];
    if (tile.tint !== unit.owner) {
      tile.tint = unit.owner;
      addFloatingText(state, '染色', arrivedTileId, unit.owner);
      if (unit.owner === 'player') {
        state.logs.unshift(`${ownerLabel(unit.owner)}士兵推进并染色 ${arrivedTileId}。`);
      }
    }
  }
}

function updateAi(state: GameState, runEnemyAi: (state: GameState) => void) {
  while (state.aiElapsedMs >= AI_MS) {
    state.aiElapsedMs -= AI_MS;
    runEnemyAi(state);
  }
}

function updateFloatingTexts(state: GameState, deltaMs: number) {
  for (const floating of state.floatingTexts) {
    floating.ageMs += deltaMs;
  }
  state.floatingTexts = state.floatingTexts.filter((floating) => floating.ageMs < FLOATING_LIFETIME_MS);
  state.logs = state.logs.slice(0, 9);
}

function resolveTimeout(state: GameState) {
  const playerTint = Object.values(state.tiles).filter((tile) => tile.tint === 'player').length;
  const enemyTint = Object.values(state.tiles).filter((tile) => tile.tint === 'enemy').length;
  state.status = playerTint >= enemyTint ? 'playerWin' : 'enemyWin';
  state.logs.unshift(
    playerTint >= enemyTint
      ? `180 秒时间到：我方染色 ${playerTint} 格，敌方 ${enemyTint} 格，判定胜利。`
      : `180 秒时间到：我方染色 ${playerTint} 格，敌方 ${enemyTint} 格，判定失败。`,
  );
}

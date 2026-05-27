import { ENEMY_BASE_ID, PLAYER_BASE_ID } from '../data/map';
import type { GameState, Owner } from '../types/game';
import { getNeighborIds, hexDistance } from '../utils/hex';
import { getEnemy } from './rules';

export function getBaseTileId(owner: Owner): string {
  return owner === 'player' ? PLAYER_BASE_ID : ENEMY_BASE_ID;
}

export function getNextStepTowardEnemyBase(state: GameState, owner: Owner, fromTileId: string): string | undefined {
  const from = state.tiles[fromTileId];
  const target = state.tiles[getBaseTileId(getEnemy(owner))];
  if (!from || !target) return undefined;

  const neighbors = getNeighborIds(from.coord)
    .filter((id) => state.tiles[id])
    .sort((a, b) => {
      const da = hexDistance(state.tiles[a].coord, target.coord);
      const db = hexDistance(state.tiles[b].coord, target.coord);
      const tintBonusA = state.tiles[a].tint === owner ? -0.15 : 0;
      const tintBonusB = state.tiles[b].tint === owner ? -0.15 : 0;
      return da + tintBonusA - (db + tintBonusB);
    });

  return neighbors[0];
}

export function getEnemyBaseBuildingId(state: GameState, owner: Owner): string | undefined {
  const baseTileId = getBaseTileId(getEnemy(owner));
  return state.tiles[baseTileId]?.buildingId;
}

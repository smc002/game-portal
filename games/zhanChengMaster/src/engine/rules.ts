import type { GameState, Owner, Tile } from '../types/game';
import { getNeighborIds } from '../utils/hex';

export function getEnemy(owner: Owner): Owner {
  return owner === 'player' ? 'enemy' : 'player';
}

export function canOccupy(state: GameState, owner: Owner, tileId: string): boolean {
  const tile = state.tiles[tileId];
  if (!tile) return false;
  if (tile.occupiedBy) return false;
  if (tile.tint !== owner) return false;
  if (!tile.revealedFor.includes(owner)) return false;
  if (tile.cost === undefined) return false;
  if (state.players[owner].gold < tile.cost) return false;
  return hasOwnedNeighbor(state, owner, tile);
}

export function hasOwnedNeighbor(state: GameState, owner: Owner, tile: Tile): boolean {
  return getNeighborIds(tile.coord).some((neighborId) => state.tiles[neighborId]?.occupiedBy === owner);
}

export function ownerLabel(owner: Owner): string {
  return owner === 'player' ? '我方' : '敌方';
}

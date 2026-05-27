import type { HexCoord, Owner, TileKind, TileTemplate } from '../types/game';
import { tileId } from '../utils/hex';

export const MAP_RADIUS = 8;
export const PLAYER_BASE_ID = tileId({ q: -6, r: 0 });
export const ENEMY_BASE_ID = tileId({ q: 6, r: 0 });
export const PLAYER_START_MINE_ID = tileId({ q: -5, r: 0 });
export const ENEMY_START_MINE_ID = tileId({ q: 5, r: 0 });

export function createMapTemplates(): TileTemplate[] {
  const templates: TileTemplate[] = [];

  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q += 1) {
    const rMin = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
    const rMax = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
    for (let r = rMin; r <= rMax; r += 1) {
      const coord = { q, r };
      const id = tileId(coord);
      if (id === PLAYER_BASE_ID || id === ENEMY_BASE_ID) {
        templates.push({ coord, kind: 'base' });
      } else if (id === PLAYER_START_MINE_ID || id === ENEMY_START_MINE_ID) {
        templates.push({ coord, kind: 'mine' });
      } else {
        templates.push({ coord, kind: chooseTileKind(coord) });
      }
    }
  }

  return templates;
}

function chooseTileKind(coord: HexCoord): Exclude<TileKind, 'empty'> {
  const distanceFromCenter = Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(-coord.q - coord.r));
  const hash = Math.abs(coord.q * 31 + coord.r * 17 + (coord.q + coord.r) * 13);

  if (Math.abs(coord.q) >= 5) {
    if (Math.abs(coord.r) === 1) return 'campLow';
    return 'question';
  }

  if (distanceFromCenter <= 2 && hash % 5 === 0) return 'campHigh';
  if (distanceFromCenter <= 4 && hash % 4 === 0) return 'campMid';
  if (hash % 11 === 0) return 'tower';
  if (hash % 7 === 0) return 'mine';
  if (hash % 3 === 0) return 'campLow';
  return 'question';
}

export function tileCost(kind: TileKind): number | undefined {
  switch (kind) {
    case 'question':
      return 25;
    case 'campLow':
      return 50;
    case 'campMid':
      return 100;
    case 'campHigh':
      return 250;
    case 'mine':
    case 'tower':
      return 50;
    default:
      return undefined;
  }
}

export function initialTint(coord: HexCoord): Owner {
  if (coord.q < 0) return 'player';
  if (coord.q > 0) return 'enemy';
  return coord.r >= 0 ? 'player' : 'enemy';
}

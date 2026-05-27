import { describe, expect, it } from 'vitest';
import type { Tile } from '../types/game';
import { getTileIdFromElement, resolvePointerUpOccupyTileId, shouldRouteTileClickToOccupy } from './HexMap';

function makeTile(overrides: Partial<Tile>): Tile {
  return {
    id: '0,0',
    coord: { q: 0, r: 0 },
    kind: 'question',
    originalKind: 'question',
    tint: 'player',
    revealedFor: ['player'],
    cost: 25,
    ...overrides,
  };
}

describe('shouldRouteTileClickToOccupy', () => {
  it('routes revealed unoccupied tiles even when gold may be insufficient', () => {
    expect(shouldRouteTileClickToOccupy(makeTile({}))).toBe(true);
  });

  it('does not route hidden or already occupied tiles', () => {
    expect(shouldRouteTileClickToOccupy(makeTile({ revealedFor: [] }))).toBe(false);
    expect(shouldRouteTileClickToOccupy(makeTile({ occupiedBy: 'player' }))).toBe(false);
  });
});

describe('getTileIdFromElement', () => {
  it('finds the tile id from nested cell content on click-like pointer release', () => {
    const child = {
      closest: (selector: string) => selector === '[data-tile-id]' ? { dataset: { tileId: '1,-1' } } : null,
    };

    expect(getTileIdFromElement(child, false)).toBe('1,-1');
  });

  it('does not route a tile id after a drag gesture', () => {
    const child = {
      closest: (selector: string) => selector === '[data-tile-id]' ? { dataset: { tileId: '1,-1' } } : null,
    };

    expect(getTileIdFromElement(child, true)).toBeUndefined();
  });
});

describe('resolvePointerUpOccupyTileId', () => {
  it('routes a short press when pointer down and up are on the same revealed tile', () => {
    const tile = makeTile({ id: '-5,0' });

    expect(resolvePointerUpOccupyTileId({
      wasDragged: false,
      startTileId: '-5,0',
      endTileId: '-5,0',
      tiles: { '-5,0': tile },
    })).toBe('-5,0');
  });

  it('does not route when the pointer dragged or released on another tile', () => {
    const tiles = { '-5,0': makeTile({ id: '-5,0' }) };

    expect(resolvePointerUpOccupyTileId({ wasDragged: true, startTileId: '-5,0', endTileId: '-5,0', tiles })).toBeUndefined();
    expect(resolvePointerUpOccupyTileId({ wasDragged: false, startTileId: '-5,0', endTileId: '-4,0', tiles })).toBeUndefined();
  });
});

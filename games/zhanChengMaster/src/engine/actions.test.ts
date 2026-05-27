import { describe, expect, it } from 'vitest';
import { PLAYER_START_MINE_ID } from '../data/map';
import { createInitialState } from './gameInit';
import { tryOccupyTile } from './actions';

describe('tryOccupyTile', () => {
  it('adds a tip when player clicks a revealed tile without enough gold', () => {
    const state = createInitialState();
    state.players.player.gold = 0;

    const result = tryOccupyTile(state, 'player', PLAYER_START_MINE_ID);

    expect(result).toBe(false);
    expect(state.floatingTexts.some((item) => item.text === '金币不足或不可占领')).toBe(true);
    expect(state.logs[0]).toBe('金币不足或不可占领');
    expect(state.tiles[PLAYER_START_MINE_ID].occupiedBy).toBeUndefined();
  });

  it('adds a tip when player clicks a revealed but non-adjacent tile', () => {
    const state = createInitialState();
    const distantTile = Object.values(state.tiles).find(
      (tile) => !tile.occupiedBy && tile.tint === 'player' && !tile.revealedFor.includes('player') && tile.cost !== undefined,
    );
    expect(distantTile).toBeDefined();
    distantTile!.revealedFor = [...distantTile!.revealedFor, 'player'];

    const result = tryOccupyTile(state, 'player', distantTile!.id);

    expect(result).toBe(false);
    expect(state.floatingTexts.some((item) => item.text === '金币不足或不可占领')).toBe(true);
    expect(state.logs[0]).toBe('金币不足或不可占领');
    expect(state.tiles[distantTile!.id].occupiedBy).toBeUndefined();
  });

  it('occupies the starting adjacent mine and spends gold', () => {
    const state = createInitialState();

    const result = tryOccupyTile(state, 'player', PLAYER_START_MINE_ID);

    expect(result).toBe(true);
    expect(state.players.player.gold).toBe(10);
    expect(state.tiles[PLAYER_START_MINE_ID].occupiedBy).toBe('player');
    expect(state.tiles[PLAYER_START_MINE_ID].buildingId).toBeDefined();
    expect(Object.values(state.buildings).some((building) => building.kind === 'mine' && building.owner === 'player')).toBe(true);
  });
});

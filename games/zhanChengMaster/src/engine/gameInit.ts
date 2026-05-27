import { DEMO_DECKS } from '../data/cards';
import { ENEMY_BASE_ID, PLAYER_BASE_ID, createMapTemplates, initialTint, tileCost } from '../data/map';
import type { GameState, Owner, Tile } from '../types/game';
import { getNeighborIds, tileId } from '../utils/hex';
import { createBuilding } from './tileReveal';

export function createInitialState(): GameState {
  const tiles: GameState['tiles'] = {};
  const buildings: GameState['buildings'] = {};

  for (const template of createMapTemplates()) {
    const id = tileId(template.coord);
    const owner = template.kind === 'base' ? baseOwner(id) : undefined;
    const tile: Tile = {
      id,
      coord: template.coord,
      kind: template.kind,
      originalKind: template.kind,
      tint: owner ?? initialTint(template.coord),
      occupiedBy: owner,
      revealedFor: owner ? ['player', 'enemy'] : [],
      cost: tileCost(template.kind),
    };
    tiles[id] = tile;
  }

  for (const owner of ['player', 'enemy'] satisfies Owner[]) {
    const baseTileId = owner === 'player' ? PLAYER_BASE_ID : ENEMY_BASE_ID;
    const buildingId = `${owner}-base`;
    buildings[buildingId] = createBuilding(buildingId, baseTileId, owner, 'base');
    tiles[baseTileId].buildingId = buildingId;
  }

  const state: GameState = {
    tiles,
    buildings,
    units: {},
    projectiles: {},
    players: {
      player: { gold: 60 },
      enemy: { gold: 60 },
    },
    decks: DEMO_DECKS,
    logs: ['战斗开始：双方初始金币 60，主城每 5 秒产出 10 金币。'],
    floatingTexts: [],
    status: 'playing',
    elapsedMs: 0,
    economyElapsedMs: 0,
    aiElapsedMs: 0,
    nextId: 1,
  };

  refreshRevealedTiles(state, 'player');
  refreshRevealedTiles(state, 'enemy');
  return state;
}

export function refreshRevealedTiles(state: GameState, owner: Owner) {
  const visible = new Set<string>();
  for (const tile of Object.values(state.tiles)) {
    if (tile.occupiedBy === owner) {
      visible.add(tile.id);
      for (const neighborId of getNeighborIds(tile.coord)) {
        if (state.tiles[neighborId]) visible.add(neighborId);
      }
    }
  }

  for (const id of visible) {
    const tile = state.tiles[id];
    if (!tile.revealedFor.includes(owner)) {
      tile.revealedFor = [...tile.revealedFor, owner];
    }
  }
}

function baseOwner(id: string): Owner | undefined {
  if (id === PLAYER_BASE_ID) return 'player';
  if (id === ENEMY_BASE_ID) return 'enemy';
  return undefined;
}

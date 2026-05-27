import { UNITS } from '../data/units';
import type { FloatingText, GameState, Owner, Unit } from '../types/game';
import { getNeighborIds } from '../utils/hex';
import { addBuildingForReveal, nextEntityId, revealTile } from './tileReveal';
import { refreshRevealedTiles } from './gameInit';
import { canOccupy, ownerLabel } from './rules';

export function tryOccupyTile(state: GameState, owner: Owner, tileId: string): boolean {
  if (state.status !== 'playing') return false;
  const tile = state.tiles[tileId];
  if (!tile) return false;

  if (!canOccupy(state, owner, tileId)) {
    if (owner === 'player') {
      addFloatingText(state, '金币不足或不可占领', tileId, owner);
      state.logs.unshift('金币不足或不可占领');
    }
    return false;
  }

  state.players[owner].gold -= tile.cost ?? 0;
  const reveal = revealTile(tile.kind, owner, state.decks[owner]);
  const buildingId = addBuildingForReveal(state, tileId, owner, reveal);

  tile.occupiedBy = owner;
  tile.tint = owner;
  tile.buildingId = buildingId;
  tile.kind = reveal.result === 'barrack' ? 'campLow' : reveal.result;
  tile.cost = undefined;

  if (reveal.result === 'barrack') {
    spawnUnitFromBarrack(state, buildingId!, true);
  }

  if (owner === 'player') {
    const buildingText = reveal.result === 'barrack' ? reveal.card.name : resultLabel(reveal.result);
    addFloatingText(state, reveal.luckyText ?? `占领：${buildingText}`, tileId, owner);
  }

  if (reveal.luckyText && owner === 'player') {
    state.logs.unshift(reveal.luckyText);
  } else {
    state.logs.unshift(`${ownerLabel(owner)}占领 ${tileId}，获得${resultLabel(reveal.result)}。`);
  }

  refreshRevealedTiles(state, owner);
  return true;
}

export function spawnUnitFromBarrack(state: GameState, buildingId: string, immediate = false) {
  const building = state.buildings[buildingId];
  if (!building || building.kind !== 'barrack' || !building.cardId) return;
  const card = state.decks[building.owner].find((item) => item.id === building.cardId);
  if (!card) return;
  const config = UNITS[card.unitId];
  const id = nextEntityId(state, 'unit');
  const unit: Unit = {
    id,
    owner: building.owner,
    unitId: card.unitId,
    tileId: building.tileId,
    fromTileId: building.tileId,
    moveProgress: 0,
    hp: config.hp,
    maxHp: config.hp,
    attackElapsedMs: 0,
  };
  state.units[id] = unit;
  if (immediate) {
    addFloatingText(state, `出兵：${config.name}`, building.tileId, building.owner);
  }
}

export function destroyBuilding(state: GameState, buildingId: string, attacker: Owner) {
  const building = state.buildings[buildingId];
  if (!building) return;
  const tile = state.tiles[building.tileId];

  if (building.kind === 'base') {
    state.status = attacker === 'player' ? 'playerWin' : 'enemyWin';
    state.logs.unshift(attacker === 'player' ? '敌方主城被摧毁，胜利！' : '我方主城被摧毁，失败。');
    return;
  }

  if (tile) {
    tile.occupiedBy = undefined;
    tile.buildingId = undefined;
    tile.tint = attacker;
    tile.kind = tile.originalKind === 'base' ? 'empty' : tile.originalKind;
    tile.cost = tile.kind === 'empty' ? 25 : tile.cost ?? defaultCost(tile.kind);
  }
  delete state.buildings[buildingId];
  addFloatingText(state, '建筑被摧毁', building.tileId, attacker);
  state.logs.unshift(`${ownerLabel(attacker)}摧毁建筑，占据染色 ${building.tileId}。`);
  refreshRevealedTiles(state, attacker);
}

export function removeDeadUnits(state: GameState) {
  for (const [id, unit] of Object.entries(state.units)) {
    if (unit.hp <= 0) {
      delete state.units[id];
    }
  }
}

export function addFloatingText(state: GameState, text: string, tileId?: string, owner?: Owner) {
  const floating: FloatingText = {
    id: nextEntityId(state, 'float'),
    text,
    tileId,
    owner,
    ageMs: 0,
  };
  state.floatingTexts.push(floating);
}

export function revealAroundOwnedTiles(state: GameState) {
  refreshRevealedTiles(state, 'player');
  refreshRevealedTiles(state, 'enemy');
}

export function findAdjacentEnemyBuilding(state: GameState, owner: Owner, tileId: string): string | undefined {
  const ids = [tileId, ...getNeighborIds(state.tiles[tileId].coord)];
  return ids
    .map((id) => state.tiles[id]?.buildingId)
    .find((buildingId) => buildingId && state.buildings[buildingId]?.owner !== owner);
}

function resultLabel(result: 'empty' | 'mine' | 'tower' | 'barrack'): string {
  if (result === 'empty') return '空地';
  if (result === 'mine') return '金矿';
  if (result === 'tower') return '防御塔';
  return '兵营';
}

function defaultCost(kind: string): number | undefined {
  if (kind === 'question') return 25;
  if (kind === 'campLow') return 50;
  if (kind === 'campMid') return 100;
  if (kind === 'campHigh') return 250;
  if (kind === 'mine' || kind === 'tower') return 50;
  return undefined;
}

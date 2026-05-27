import { BUILDING_STATS } from '../data/buildings';
import { UNITS } from '../data/units';
import type { Building, GameState, Owner, Projectile, ProjectileTarget, Unit } from '../types/game';
import { getNeighborIds, hexDistance } from '../utils/hex';
import { destroyBuilding, findAdjacentEnemyBuilding, removeDeadUnits } from './actions';
import { getEnemy } from './rules';
import { nextEntityId } from './tileReveal';

export function updateCombat(state: GameState, deltaMs: number) {
  updateUnitCombat(state, deltaMs);
  updateProjectiles(state, deltaMs);
  removeDeadUnits(state);
  updateTowerCombat(state, deltaMs);
  updateProjectiles(state, deltaMs);
  removeDeadUnits(state);
}

function updateUnitCombat(state: GameState, deltaMs: number) {
  for (const unit of Object.values(state.units)) {
    const config = UNITS[unit.unitId];
    unit.attackElapsedMs += deltaMs;

    const targetUnit = findUnitTarget(state, unit, config.range);
    if (targetUnit) {
      unit.attackTargetId = targetUnit.id;
      if (unit.attackElapsedMs >= config.attackMs) {
        unit.attackElapsedMs = 0;
        if (config.range > 1) {
          createProjectile(state, unit.owner, unitEffectiveTileId(unit), { kind: 'unit', id: targetUnit.id }, unitEffectiveTileId(targetUnit), config.damage, projectileStyleForUnit(unit.unitId));
        } else {
          targetUnit.hp -= config.damage;
        }
      }
      continue;
    }

    const buildingId = findBuildingTargetInRange(state, unit.owner, unitEffectiveTileId(unit), config.range);
    if (buildingId && unit.attackElapsedMs >= config.attackMs) {
      unit.attackElapsedMs = 0;
      if (config.range > 1) {
        const building = state.buildings[buildingId];
        createProjectile(state, unit.owner, unitEffectiveTileId(unit), { kind: 'building', id: buildingId }, building.tileId, config.damage, projectileStyleForUnit(unit.unitId));
      } else {
        const building = state.buildings[buildingId];
        building.hp -= config.damage;
        if (building.hp <= 0) {
          destroyBuilding(state, buildingId, unit.owner);
        }
      }
    }
  }
}

function updateTowerCombat(state: GameState, deltaMs: number) {
  for (const building of Object.values(state.buildings)) {
    const isBase = building.kind === 'base';
    const isTower = building.kind === 'tower';
    if (!isBase && !isTower) continue;

    const range = isBase ? BUILDING_STATS.base.towerRange : BUILDING_STATS.tower.range;
    const damage = isBase ? BUILDING_STATS.base.towerDamage : BUILDING_STATS.tower.damage;
    const attackMs = isBase ? BUILDING_STATS.base.towerAttackMs : BUILDING_STATS.tower.attackMs;

    building.attackElapsedMs += deltaMs;
    const target = getValidTowerTarget(state, building.attackTargetId, building.owner, building.tileId, range)
      ?? findNearestEnemyUnit(state, building.owner, building.tileId, range);

    building.attackTargetId = target?.id;
    if (target && building.attackElapsedMs >= attackMs) {
      building.attackElapsedMs = 0;
      createProjectile(state, building.owner, building.tileId, { kind: 'unit', id: target.id }, unitEffectiveTileId(target), damage, building.kind === 'base' ? 'bolt' : 'arrow');
    }
  }
}

function updateProjectiles(state: GameState, deltaMs: number) {
  for (const projectile of Object.values(state.projectiles)) {
    projectile.progress += (projectile.speed * deltaMs) / 1000;
    const targetTileId = getProjectileTargetTileId(state, projectile);
    if (targetTileId) {
      projectile.targetTileId = targetTileId;
    }

    if (projectile.progress < 1) continue;
    applyProjectileHit(state, projectile);
    delete state.projectiles[projectile.id];
  }
}

function findUnitTarget(state: GameState, unit: Unit, range: number): Unit | undefined {
  const current = state.tiles[unitEffectiveTileId(unit)];
  if (!current) return undefined;

  const previous = unit.attackTargetId ? state.units[unit.attackTargetId] : undefined;
  if (previous && previous.owner !== unit.owner && isInRange(state, unitEffectiveTileId(unit), unitEffectiveTileId(previous), range)) {
    return previous;
  }

  return Object.values(state.units)
    .filter((target) => target.owner !== unit.owner && isInRange(state, unitEffectiveTileId(unit), unitEffectiveTileId(target), range))
    .sort((a, b) => a.hp - b.hp)[0];
}

function findBuildingTargetInRange(state: GameState, owner: Owner, tileId: string, range: number): string | undefined {
  if (range <= 1) {
    return findAdjacentEnemyBuilding(state, owner, tileId);
  }
  return Object.values(state.buildings)
    .filter((building) => building.owner !== owner && isInRange(state, tileId, building.tileId, range))
    .sort((a, b) => {
      const kindScore = (buildingKind: string) => (buildingKind === 'base' ? 0 : 1);
      return kindScore(a.kind) - kindScore(b.kind);
    })[0]?.id;
}

function getValidTowerTarget(
  state: GameState,
  targetId: string | undefined,
  owner: Owner,
  tileId: string,
  range: number,
): Unit | undefined {
  if (!targetId) return undefined;
  const target = state.units[targetId];
  if (!target || target.owner === owner) return undefined;
  return isInRange(state, tileId, unitEffectiveTileId(target), range) ? target : undefined;
}

function findNearestEnemyUnit(state: GameState, owner: Owner, tileId: string, range: number): Unit | undefined {
  const tile = state.tiles[tileId];
  if (!tile) return undefined;
  return Object.values(state.units)
    .filter((unit) => unit.owner === getEnemy(owner) && isInRange(state, tileId, unitEffectiveTileId(unit), range))
    .sort((a, b) => {
      const da = hexDistance(tile.coord, state.tiles[unitEffectiveTileId(a)].coord);
      const db = hexDistance(tile.coord, state.tiles[unitEffectiveTileId(b)].coord);
      return da - db;
    })[0];
}

function isInRange(state: GameState, fromTileId: string, toTileId: string, range: number): boolean {
  const from = state.tiles[fromTileId];
  const to = state.tiles[toTileId];
  if (!from || !to) return false;
  return hexDistance(from.coord, to.coord) <= range;
}

function unitEffectiveTileId(unit: Unit): string {
  return unit.toTileId ?? unit.tileId;
}

function createProjectile(
  state: GameState,
  owner: Owner,
  sourceTileId: string,
  target: ProjectileTarget,
  targetTileId: string,
  damage: number,
  style: Projectile['style'],
) {
  const id = nextEntityId(state, 'projectile');
  state.projectiles[id] = {
    id,
    owner,
    sourceTileId,
    target,
    targetTileId,
    damage,
    progress: 0,
    speed: style === 'magic' ? 2.4 : 3.2,
    style,
  };
}

function applyProjectileHit(state: GameState, projectile: Projectile) {
  if (projectile.target.kind === 'unit') {
    const unit = state.units[projectile.target.id];
    if (unit) {
      unit.hp -= projectile.damage;
    }
    return;
  }

  const building = state.buildings[projectile.target.id];
  if (!building) return;
  building.hp -= projectile.damage;
  if (building.hp <= 0) {
    destroyBuilding(state, building.id, projectile.owner);
  }
}

function getProjectileTargetTileId(state: GameState, projectile: Projectile): string | undefined {
  if (projectile.target.kind === 'unit') {
    const unit = state.units[projectile.target.id];
    return unit ? unitEffectiveTileId(unit) : undefined;
  }
  const building = state.buildings[projectile.target.id];
  return building?.tileId;
}

function projectileStyleForUnit(unitId: string): Projectile['style'] {
  return unitId === 'mage' ? 'magic' : 'arrow';
}

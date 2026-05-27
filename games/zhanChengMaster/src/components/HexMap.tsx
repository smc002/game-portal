import { useRef, useState } from 'react';
import { UNITS } from '../data/units';
import { canOccupy as canOccupyRule } from '../engine/rules';
import type { Building, GameState, Projectile, Tile, Unit } from '../types/game';
import { hexToPixel } from '../utils/hex';
import { FloatingTextLayer } from './FloatingTextLayer';
import { HexCell } from './HexCell';

const HEX_SIZE = 54;
const CELL_WIDTH = 98;
const CELL_HEIGHT = 112;
const MAP_WIDTH = 1700;
const MAP_HEIGHT = 1360;
const CENTER_X = MAP_WIDTH / 2;
const CENTER_Y = MAP_HEIGHT / 2;
const DEFAULT_VIEW_SCALE = 1;
const DEFAULT_PAN = { x: 360, y: 0 };
const MIN_VIEW_SCALE = 0.35;
const MAX_VIEW_SCALE = 1.6;
const ZOOM_STEP = 0.1;
const DRAG_THRESHOLD = 6;

export function HexMap({
  tiles,
  buildings,
  units,
  projectiles,
  floatingTexts,
  state,
  onOccupy,
}: {
  tiles: Record<string, Tile>;
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  projectiles: Record<string, Projectile>;
  floatingTexts: GameState['floatingTexts'];
  state: GameState;
  onOccupy: (tileId: string) => void;
}) {
  const [viewScale, setViewScale] = useState(DEFAULT_VIEW_SCALE);
  const [pan, setPan] = useState(DEFAULT_PAN);
  const dragRef = useRef({
    active: false,
    dragged: false,
    pointerId: -1,
    startTileId: undefined as string | undefined,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const unitListByTile = Object.values(units).reduce<Record<string, Unit[]>>((acc, unit) => {
    acc[unit.tileId] = [...(acc[unit.tileId] ?? []), unit];
    return acc;
  }, {});

  const zoomBy = (delta: number) => {
    setViewScale((scale) => clampScale(scale + delta));
  };

  const resetView = () => {
    setViewScale(DEFAULT_VIEW_SCALE);
    setPan(DEFAULT_PAN);
  };

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startTileId: getTileIdFromElement(event.target, false),
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    const totalDx = event.clientX - drag.startX;
    const totalDy = event.clientY - drag.startY;
    if (Math.hypot(totalDx, totalDy) >= DRAG_THRESHOLD) {
      drag.dragged = true;
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (drag.dragged) {
      setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId === event.pointerId) {
      const wasDragged = drag.dragged;
      const startTileId = drag.startTileId;
      drag.active = false;
      drag.dragged = false;
      drag.startTileId = undefined;

      const endTileId = getTileIdFromElement(document.elementFromPoint(event.clientX, event.clientY), wasDragged);
      const occupyTileId = resolvePointerUpOccupyTileId({
        wasDragged,
        startTileId,
        endTileId,
        tiles,
      });
      if (occupyTileId) {
        onOccupy(occupyTileId);
      }
    }
  };

  return (
    <section className="relative min-h-[820px] overflow-hidden rounded-lg border border-stone-500 bg-[#394030]">
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[1360px] w-[1700px] -translate-x-1/2 -translate-y-1/2"
          style={{ marginLeft: pan.x, marginTop: pan.y }}
        >
          <div className="relative h-full w-full origin-center" style={{ transform: `scale(${viewScale})` }}>
            {Object.values(tiles).map((tile) => {
              const pos = hexToPixel(tile.coord, HEX_SIZE);
              const visible = tile.revealedFor.includes('player') || tile.occupiedBy !== undefined;
              const canOccupy = canOccupyRule(state, 'player', tile.id);
              return (
                <div
                  key={tile.id}
                  className="absolute"
                  style={{
                    left: pos.x + CENTER_X - CELL_WIDTH / 2,
                    top: pos.y + CENTER_Y - CELL_HEIGHT / 2,
                  width: CELL_WIDTH,
                  height: CELL_HEIGHT,
                }}
                data-tile-id={tile.id}
              >
                <HexCell
                    building={tile.buildingId ? buildings[tile.buildingId] : undefined}
                    canOccupy={canOccupy}
                  tile={tile}
                  units={unitListByTile[tile.id] ?? []}
                  visible={visible}
                  onClick={() => {
                    // Occupation is routed from pointerup on the map layer so pointer
                    // capture for dragging cannot swallow tile clicks.
                  }}
                />
                </div>
              );
            })}
            <ProjectileLayer projectiles={Object.values(projectiles)} tiles={tiles} />
            <UnitLayer tiles={tiles} units={Object.values(units)} />
            <FloatingTextLayer centerX={CENTER_X} centerY={CENTER_Y} size={HEX_SIZE} texts={floatingTexts} tiles={tiles} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 rounded bg-stone-900/75 px-3 py-2 text-xs text-stone-100">
        滚轮缩放；按住地图拖动；未知格保留染色但隐藏内容。
      </div>
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded bg-stone-900/80 p-2 text-sm text-stone-100">
        <button className="h-8 w-8 rounded bg-stone-700 font-semibold hover:bg-stone-600" onClick={(event) => { event.stopPropagation(); zoomBy(ZOOM_STEP); }} type="button">
          +
        </button>
        <button className="h-8 w-8 rounded bg-stone-700 font-semibold hover:bg-stone-600" onClick={(event) => { event.stopPropagation(); zoomBy(-ZOOM_STEP); }} type="button">
          -
        </button>
        <button className="rounded bg-amber-300 px-3 py-1.5 font-semibold text-stone-950 hover:bg-amber-200" onClick={(event) => { event.stopPropagation(); resetView(); }} type="button">
          重置
        </button>
        <span className="min-w-12 text-right text-xs">{Math.round(viewScale * 100)}%</span>
      </div>
    </section>
  );
}

export function shouldRouteTileClickToOccupy(tile: Tile | undefined): boolean {
  return !!tile && tile.revealedFor.includes('player') && !tile.occupiedBy;
}

export function getTileIdFromElement(target: unknown, wasDragged: boolean): string | undefined {
  if (wasDragged || !hasClosest(target)) return undefined;
  return target.closest('[data-tile-id]')?.dataset?.tileId;
}

export function resolvePointerUpOccupyTileId({
  wasDragged,
  startTileId,
  endTileId,
  tiles,
}: {
  wasDragged: boolean;
  startTileId?: string;
  endTileId?: string;
  tiles: Record<string, Tile>;
}): string | undefined {
  if (wasDragged || !startTileId || startTileId !== endTileId) return undefined;
  return shouldRouteTileClickToOccupy(tiles[endTileId]) ? endTileId : undefined;
}

function hasClosest(target: unknown): target is { closest: (selector: string) => { dataset?: { tileId?: string } } | null } {
  return typeof target === 'object' && target !== null && 'closest' in target && typeof target.closest === 'function';
}

function clampScale(scale: number): number {
  return Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, Number(scale.toFixed(2))));
}

function ProjectileLayer({ tiles, projectiles }: { tiles: Record<string, Tile>; projectiles: Projectile[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {projectiles.map((projectile) => {
        const source = tiles[projectile.sourceTileId];
        const target = tiles[projectile.targetTileId];
        if (!source || !target) return null;

        const from = hexToPixel(source.coord, HEX_SIZE);
        const to = hexToPixel(target.coord, HEX_SIZE);
        const x = from.x + (to.x - from.x) * projectile.progress + CENTER_X;
        const y = from.y + (to.y - from.y) * projectile.progress + CENTER_Y;
        const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
        const className = projectile.style === 'magic'
          ? 'h-3 w-3 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.95)]'
          : projectile.style === 'bolt'
            ? 'h-2 w-6 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(253,230,138,0.9)]'
            : 'h-1.5 w-7 rounded-full bg-stone-100 shadow-[0_0_8px_rgba(255,255,255,0.75)]';

        return (
          <div
            key={projectile.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}
            style={{ left: x, top: y, transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
          />
        );
      })}
    </div>
  );
}

function UnitLayer({ tiles, units }: { tiles: Record<string, Tile>; units: Unit[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {units.map((unit, index) => {
        const fromTile = tiles[unit.fromTileId] ?? tiles[unit.tileId];
        const toTile = unit.toTileId ? tiles[unit.toTileId] : undefined;
        if (!fromTile) return null;

        const from = hexToPixel(fromTile.coord, HEX_SIZE);
        const to = toTile ? hexToPixel(toTile.coord, HEX_SIZE) : from;
        const x = from.x + (to.x - from.x) * unit.moveProgress + CENTER_X;
        const y = from.y + (to.y - from.y) * unit.moveProgress + CENTER_Y;
        const offset = ((index % 5) - 2) * 4;
        const color = unit.owner === 'player' ? 'bg-emerald-200 border-emerald-900 text-emerald-950' : 'bg-rose-200 border-rose-900 text-rose-950';
        const icon = UNITS[unit.unitId].icon;
        return (
          <div
            key={unit.id}
            className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold leading-none shadow ${color}`}
            style={{ left: x + offset, top: y - offset }}
            title={unit.id}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
}

import type { Building, Tile, Unit } from '../types/game';
import { BUILDING_STATS } from '../data/buildings';

const kindLabel: Record<string, string> = {
  question: '?',
  campLow: '低',
  campMid: '中',
  campHigh: '高',
  mine: '矿',
  tower: '塔',
  empty: '空',
  base: '城',
};

const buildingLabel: Record<string, string> = {
  base: '主城',
  mine: '金矿',
  tower: '箭塔',
  barrack: '兵营',
};

export function HexCell({
  tile,
  building,
  units,
  canOccupy,
  visible,
  onClick,
}: {
  tile: Tile;
  building?: Building;
  units: Unit[];
  canOccupy: boolean;
  visible: boolean;
  onClick: () => void;
}) {
  const playerUnits = units.filter((unit) => unit.owner === 'player').length;
  const enemyUnits = units.filter((unit) => unit.owner === 'enemy').length;
  const tintClass = building
    ? tile.tint === 'player'
      ? 'bg-emerald-800/95'
      : 'bg-rose-800/95'
    : tile.tint === 'player'
      ? 'bg-emerald-600/80'
      : 'bg-rose-600/75';
  const borderClass = tile.occupiedBy === 'player'
    ? 'border-emerald-100'
    : tile.occupiedBy === 'enemy'
      ? 'border-rose-100'
      : canOccupy
        ? 'border-amber-200'
        : 'border-stone-300/80';

  return (
    <button
      className={`hex-cell absolute flex flex-col items-center justify-center border text-center transition hover:z-10 hover:scale-105 ${tintClass} ${borderClass} ${visible ? 'opacity-100' : 'opacity-70'} ${canOccupy ? 'shadow-[0_0_18px_rgba(252,211,77,0.45)]' : ''}`}
      disabled={!visible}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={visible ? `${canOccupy ? '可占领 ' : ''}${kindLabel[tile.kind]} ${tile.cost ? `${tile.cost} 金币` : ''}` : '未知区域'}
      type="button"
    >
      {!visible ? null : (
        <>
          {building && <ProgressRing building={building} />}
          <div className="relative z-10 text-lg font-semibold text-white">{building ? buildingLabel[building.kind] : kindLabel[tile.kind]}</div>
          {building ? (
            <div className="relative z-10 mt-1 text-[10px] text-stone-100">
              {Math.ceil(building.hp)}/{building.maxHp}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-stone-300">{tile.cost ? `${tile.cost}g` : '未占'}</div>
          )}
        </>
      )}
      {visible && (playerUnits > 0 || enemyUnits > 0) && (
        <div className="mt-1 flex gap-1 text-[10px]">
          {playerUnits > 0 && <span className="rounded bg-emerald-300 px-1 text-stone-950">兵{playerUnits}</span>}
          {enemyUnits > 0 && <span className="rounded bg-rose-300 px-1 text-stone-950">敌{enemyUnits}</span>}
        </div>
      )}
    </button>
  );
}

function ProgressRing({ building }: { building: Building }) {
  const progress = getProgress(building);
  if (progress === undefined) return null;

  const angle = Math.round(progress * 360);
  const color = building.kind === 'mine' ? '#facc15' : '#93c5fd';
  return (
    <div
      className="absolute inset-4 rounded-full opacity-90"
      style={{ background: `conic-gradient(${color} ${angle}deg, rgba(15,23,42,0.35) ${angle}deg)` }}
    >
      <div className="absolute inset-1 rounded-full bg-black/25" />
    </div>
  );
}

function getProgress(building: Building): number | undefined {
  if (building.kind === 'mine') {
    return Math.min(1, building.goldElapsedMs / BUILDING_STATS.mine.intervalMs);
  }
  if (building.kind === 'barrack' && building.spawnMs) {
    return Math.min(1, building.spawnElapsedMs / building.spawnMs);
  }
  return undefined;
}

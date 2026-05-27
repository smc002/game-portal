import { MATCH_LIMIT_MS } from '../engine/tick';
import type { Building, GameStatus, Owner, PlayerState, Tile, Unit } from '../types/game';

type Props = {
  players: Record<Owner, PlayerState>;
  buildings: Record<string, Building>;
  tiles: Record<string, Tile>;
  units: Record<string, Unit>;
  status: GameStatus;
  elapsedMs: number;
  onReset: () => void;
};

export function BattleHud({ players, buildings, tiles, units, status, elapsedMs, onReset }: Props) {
  const playerBase = Object.values(buildings).find((building) => building.kind === 'base' && building.owner === 'player');
  const enemyBase = Object.values(buildings).find((building) => building.kind === 'base' && building.owner === 'enemy');
  const resultText = status === 'playerWin' ? '胜利' : status === 'enemyWin' ? '失败' : '交战中';
  const playerTint = Object.values(tiles).filter((tile) => tile.tint === 'player').length;
  const enemyTint = Object.values(tiles).filter((tile) => tile.tint === 'enemy').length;
  const playerUnits = Object.values(units).filter((unit) => unit.owner === 'player').length;
  const enemyUnits = Object.values(units).filter((unit) => unit.owner === 'enemy').length;
  const remainingSeconds = Math.max(0, Math.ceil((MATCH_LIMIT_MS - elapsedMs) / 1000));

  return (
    <header className="grid gap-3 border-b border-stone-700 pb-4 lg:grid-cols-[1fr_auto_1fr]">
      <BasePanel label="我方" gold={players.player.gold} base={playerBase} tintCount={playerTint} unitCount={playerUnits} tone="player" />
      <div className="flex min-w-44 flex-col items-center justify-center rounded-md border border-amber-300 bg-stone-950 px-5 py-3 text-center shadow-lg">
        <div className="text-xs font-semibold text-amber-200">占城大师 M0</div>
        <div className="mt-1 text-2xl font-semibold text-white">{resultText}</div>
        <div className="mt-2 rounded bg-amber-300 px-3 py-1 text-lg font-bold text-stone-950">剩余 {remainingSeconds} 秒</div>
        <button className="mt-3 rounded bg-amber-300 px-3 py-1.5 text-sm font-semibold text-stone-950 hover:bg-amber-200" onClick={onReset} type="button">
          重新开始
        </button>
      </div>
      <BasePanel label="敌方" gold={players.enemy.gold} base={enemyBase} tintCount={enemyTint} unitCount={enemyUnits} tone="enemy" />
    </header>
  );
}

function BasePanel({
  label,
  gold,
  base,
  tintCount,
  unitCount,
  tone,
}: {
  label: string;
  gold: number;
  base?: Building;
  tintCount: number;
  unitCount: number;
  tone: 'player' | 'enemy';
}) {
  const hpPercent = base ? Math.max(0, Math.round((base.hp / base.maxHp) * 100)) : 0;
  const toneClass = tone === 'player' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500';
  return (
    <section className="rounded-md border border-stone-700 bg-stone-950/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-stone-400">{label}</div>
          <div className="mt-1 text-xl font-semibold text-white">{gold} 金币</div>
        </div>
        <div className="text-right text-sm text-stone-300">主城 {Math.max(0, Math.ceil(base?.hp ?? 0))}/{base?.maxHp ?? 0}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-300">
        <div className="rounded bg-stone-900 px-2 py-1">染色 {tintCount}</div>
        <div className="rounded bg-stone-900 px-2 py-1">士兵 {unitCount}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-stone-800">
        <div className={`h-full bg-gradient-to-r ${toneClass}`} style={{ width: `${hpPercent}%` }} />
      </div>
    </section>
  );
}

import { UNITS } from '../data/units';
import type { BarrackCard } from '../types/game';

const qualityClass: Record<string, string> = {
  green: 'border-emerald-400 bg-emerald-500/12 text-emerald-100',
  blue: 'border-sky-400 bg-sky-500/12 text-sky-100',
  purple: 'border-fuchsia-400 bg-fuchsia-500/12 text-fuchsia-100',
  orange: 'border-amber-400 bg-amber-500/12 text-amber-100',
};

const qualityLabel: Record<string, string> = {
  green: '绿',
  blue: '蓝',
  purple: '紫',
  orange: '橙',
};

export function CardDeckPanel({ deck }: { deck: BarrackCard[] }) {
  return (
    <section className="rounded-lg border border-stone-700 bg-stone-950/60 p-4">
      <h2 className="text-base font-semibold text-white">我方兵营卡组</h2>
      <div className="mt-3 grid gap-2">
        {deck.map((card) => {
          const unit = UNITS[card.unitId];
          return (
            <div key={card.id} className={`rounded-md border p-3 ${qualityClass[card.quality]}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{card.name}</div>
                <div className="rounded border border-white/20 px-1.5 py-0.5 text-xs">{qualityLabel[card.quality]}</div>
              </div>
              <div className="mt-2 text-xs opacity-80">
                {unit.name} · {unit.speedLabel} · {(card.spawnMs / 1000).toFixed(1)}秒/个
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

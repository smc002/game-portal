import { useEffect, useRef } from 'react';
import { BattleHud } from './components/BattleHud';
import { CardDeckPanel } from './components/CardDeckPanel';
import { EventLog } from './components/EventLog';
import { HexMap } from './components/HexMap';
import { useGameStore } from './store/gameStore';

const TICK_MS = 250;

export default function App() {
  const state = useGameStore();
  const tick = useGameStore((store) => store.tick);
  const occupyTile = useGameStore((store) => store.occupyTile);
  const reset = useGameStore((store) => store.reset);
  const lastTickRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;
    let carry = 0;

    const loop = (time: number) => {
      const previous = lastTickRef.current ?? time;
      const delta = Math.min(500, time - previous);
      lastTickRef.current = time;
      carry += delta;

      while (carry >= TICK_MS) {
        tick(TICK_MS);
        carry -= TICK_MS;
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [tick]);

  return (
    <main className="min-h-screen bg-[#e6e1ca] text-stone-900">
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4">
        <BattleHud
          buildings={state.buildings}
          elapsedMs={state.elapsedMs}
          players={state.players}
          status={state.status}
          tiles={state.tiles}
          units={state.units}
          onReset={reset}
        />

        <div className="grid flex-1 grid-cols-1 gap-4 2xl:grid-cols-[260px_1fr_300px]">
          <CardDeckPanel deck={state.decks.player} />
          <HexMap
            buildings={state.buildings}
            floatingTexts={state.floatingTexts}
            projectiles={state.projectiles}
            state={state}
            tiles={state.tiles}
            units={state.units}
            onOccupy={(tileId) => occupyTile('player', tileId)}
          />
          <aside className="flex flex-col gap-4">
            <RulePanel />
            <EventLog logs={state.logs} />
          </aside>
        </div>

        {state.status !== 'playing' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4">
            <div className="w-full max-w-sm rounded-lg border border-amber-300 bg-stone-950 p-6 text-center shadow-2xl">
              <div className="text-sm text-amber-200">战斗结束</div>
              <div className="mt-2 text-3xl font-semibold text-white">{state.status === 'playerWin' ? '胜利' : '失败'}</div>
              <button className="mt-5 rounded bg-amber-300 px-4 py-2 font-semibold text-stone-950 hover:bg-amber-200" onClick={reset} type="button">
                再来一局
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function RulePanel() {
  return (
    <section className="rounded-lg border border-stone-700 bg-stone-950/60 p-4">
      <h2 className="text-base font-semibold text-white">Demo 规则</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-300">
        <li>初始金币 60，主城和金矿每 5 秒产出金币。</li>
        <li>只能占领己方染色且相邻己方建筑的地块。</li>
        <li>兵营完成后立即出 1 个兵，之后约 10 秒生产 1 个。</li>
        <li>士兵以小单位连续移动，进入敌色格会染色。</li>
        <li>未邻接地格只显示染色，不显示内容符号。</li>
        <li>180 秒超时后按双方染色格数量判胜。</li>
        <li>防御塔锁定最近士兵，目标死亡或离开射程后换目标。</li>
      </ul>
    </section>
  );
}

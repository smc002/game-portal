import { useGameStore } from '../store/gameStore';

export default function Overlay() {
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.startGame);
  const resume = useGameStore((s) => s.resumeGame);
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.best);

  if (status === 'playing') return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="animate-pop pointer-events-auto rounded-lg border-2 border-slate-700 bg-slate-950/90 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
        {status === 'idle' && (
          <>
            <h1 className="mb-2 text-3xl font-black tracking-wider text-white">
              TETRIS
            </h1>
            <p className="mb-4 text-xs text-slate-400">俄罗斯方块 · 经典单机版</p>
            <button
              onClick={start}
              className="rounded bg-cyan-500 px-6 py-2 font-bold text-slate-900 shadow hover:bg-cyan-400"
            >
              开始游戏 (Enter)
            </button>
          </>
        )}
        {status === 'paused' && (
          <>
            <h2 className="mb-3 text-2xl font-bold text-yellow-400">暂停</h2>
            <button
              onClick={resume}
              className="rounded bg-yellow-500 px-6 py-2 font-bold text-slate-900 hover:bg-yellow-400"
            >
              继续 (Esc)
            </button>
          </>
        )}
        {status === 'gameover' && (
          <>
            <h2 className="mb-2 text-2xl font-bold text-red-400">Game Over</h2>
            <div className="mb-1 font-mono text-lg text-white">分数 {score}</div>
            <div className="mb-4 font-mono text-xs text-slate-400">最佳 {best}</div>
            <button
              onClick={start}
              className="rounded bg-cyan-500 px-6 py-2 font-bold text-slate-900 hover:bg-cyan-400"
            >
              再来一局 (R)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

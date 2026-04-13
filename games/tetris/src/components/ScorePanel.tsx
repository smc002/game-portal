import { useGameStore } from '../store/gameStore';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="font-mono text-lg font-bold text-white tabular-nums">
        {value}
      </div>
    </div>
  );
}

export default function ScorePanel() {
  const score = useGameStore((s) => s.score);
  const level = useGameStore((s) => s.level);
  const lines = useGameStore((s) => s.lines);
  const best = useGameStore((s) => s.best);
  return (
    <div className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/40 p-3">
      <Stat label="Score" value={score} />
      <Stat label="Best" value={best} />
      <Stat label="Level" value={level} />
      <Stat label="Lines" value={lines} />
    </div>
  );
}

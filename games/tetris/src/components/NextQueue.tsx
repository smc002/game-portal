import { useGameStore } from '../store/gameStore';
import MiniPiece from './MiniPiece';

export default function NextQueue() {
  const queue = useGameStore((s) => s.queue);
  const next5 = queue.slice(0, 5);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Next
      </div>
      <div className="flex flex-col gap-1">
        {next5.map((t, i) => (
          <MiniPiece key={i} type={t} />
        ))}
      </div>
    </div>
  );
}

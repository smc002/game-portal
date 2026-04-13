import { useGameStore } from '../store/gameStore';
import MiniPiece from './MiniPiece';

export default function HoldPanel() {
  const hold = useGameStore((s) => s.hold);
  const canHold = useGameStore((s) => s.canHold);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Hold
      </div>
      <div className={canHold ? '' : 'opacity-40'}>
        <MiniPiece type={hold} />
      </div>
    </div>
  );
}

import { useGameStore } from '../../store/gameStore';

export function Header() {
  const { round, gold, heroes } = useGameStore();

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <span className="text-white font-bold">第 {round} 回合</span>
        <span className="text-yellow-400 font-bold">{gold} 金币</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">武将: {heroes.length}/5</span>
      </div>
    </div>
  );
}

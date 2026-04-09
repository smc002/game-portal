import { useGameStore } from '../../store/gameStore';

export function SettlementPhase() {
  const { lastBattleGoldReward, gold, round, advanceToNextRound } = useGameStore();

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-2xl font-bold text-green-400 mb-4">战斗胜利！</h2>
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <p className="text-yellow-400 text-3xl font-bold mb-2">+{lastBattleGoldReward} 金币</p>
        <p className="text-gray-400">当前金币: {gold}</p>
      </div>
      <button
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
        onClick={advanceToNextRound}
      >
        继续
      </button>
    </div>
  );
}

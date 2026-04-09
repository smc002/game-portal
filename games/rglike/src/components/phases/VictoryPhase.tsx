import { useGameStore } from '../../store/gameStore';
import { getHeroDefinition } from '../../data/heroes';

export function VictoryPhase() {
  const { stats, heroes, startNewGame } = useGameStore();

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-3xl font-bold text-yellow-400 mb-2">胜利！</h2>
      <p className="text-white text-lg mb-6">恭喜你通关了全部30回合！</p>
      <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-3">
        <div className="text-white text-lg">
          <span className="text-yellow-400 font-bold text-3xl">30 / 30</span>
        </div>
        <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
          <p className="text-gray-300">
            困难选择次数: <span className="text-white font-bold">{stats.hardChoiceCount}</span>
          </p>
          <p className="text-gray-300">
            击败Boss数: <span className="text-white font-bold">{stats.bossesDefeated}</span>
          </p>
          <p className="text-gray-300">
            总获取金币: <span className="text-yellow-400 font-bold">{stats.totalGoldEarned}</span>
          </p>
          <p className="text-gray-300">
            最终阵容: <span className="text-white font-bold">
              {heroes.map((h) => {
                const def = getHeroDefinition(h.definitionId);
                return `${def.name}(Lv.${h.level})`;
              }).join(', ')}
            </span>
          </p>
        </div>
      </div>
      <button
        className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors"
        onClick={startNewGame}
      >
        再来一局
      </button>
    </div>
  );
}

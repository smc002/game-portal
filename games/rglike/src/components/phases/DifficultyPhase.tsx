import { useGameStore } from '../../store/gameStore';
import { EnemyPreview } from '../../engine/enemyGenerator';

function PreviewInfo({ preview }: { preview: EnemyPreview | null }) {
  if (!preview) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {preview.bossName && (
        <div className="text-purple-400 font-bold text-sm">
          Boss: {preview.bossName}
        </div>
      )}
      {preview.entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {preview.entries.map((e, i) => (
            <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-200">
              {e.name} ×{e.count}
            </span>
          ))}
        </div>
      )}
      <div className="text-yellow-400 font-bold text-lg">
        {preview.gold} 金币
      </div>
    </div>
  );
}

export function DifficultyPhase() {
  const { selectDifficulty, round, enemyPreviewEasy, enemyPreviewHard } = useGameStore();
  const isBoss = enemyPreviewEasy?.isBoss || false;

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold text-white text-center mb-2">选择难度</h2>
      <p className="text-gray-400 text-center mb-6">
        第 {round} 回合 {isBoss ? '- Boss战！' : ''}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className="bg-gray-800 border-2 border-green-600 hover:border-green-400 rounded-lg p-6 transition-all hover:scale-105 text-left"
          onClick={() => selectDifficulty('easy')}
        >
          <h3 className="text-xl font-bold text-green-400 mb-1">简单</h3>
          <p className="text-gray-400 text-xs mb-2">敌人较弱，数量较少</p>
          <PreviewInfo preview={enemyPreviewEasy} />
        </button>
        <button
          className="bg-gray-800 border-2 border-red-600 hover:border-red-400 rounded-lg p-6 transition-all hover:scale-105 text-left"
          onClick={() => selectDifficulty('hard')}
        >
          <h3 className="text-xl font-bold text-red-400 mb-1">困难</h3>
          <p className="text-gray-400 text-xs mb-2">敌人更强，数量更多</p>
          <PreviewInfo preview={enemyPreviewHard} />
        </button>
      </div>
    </div>
  );
}

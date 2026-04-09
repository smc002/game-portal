import { useGameStore } from '../../store/gameStore';
import { HeroCard } from '../common/HeroCard';

export function UpgradePhase() {
  const { upgradeChoices, heroes, upgradeHero, round } = useGameStore();

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-2xl font-bold text-white text-center mb-2">升级武将</h2>
      <p className="text-gray-400 text-center mb-6">第 {round} 回合 - 选择一位武将进行升级</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {upgradeChoices.map((heroId) => {
          const instance = heroes.find((h) => h.definitionId === heroId);
          return (
            <HeroCard
              key={heroId}
              heroId={heroId}
              instance={instance}
              onClick={() => upgradeHero(heroId)}
            />
          );
        })}
      </div>
    </div>
  );
}

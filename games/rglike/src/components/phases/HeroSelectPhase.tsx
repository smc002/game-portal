import { useGameStore } from '../../store/gameStore';
import { HeroCard } from '../common/HeroCard';

export function HeroSelectPhase() {
  const { heroChoices, selectHero, round } = useGameStore();

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold text-white text-center mb-2">招募武将</h2>
      <p className="text-gray-400 text-center mb-6">第 {round} 回合 - 选择一位武将加入你的队伍</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {heroChoices.map((heroId) => (
          <HeroCard
            key={heroId}
            heroId={heroId}
            onClick={() => selectHero(heroId)}
          />
        ))}
      </div>
    </div>
  );
}

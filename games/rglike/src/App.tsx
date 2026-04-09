import { useGameStore } from './store/gameStore';
import { GameLayout } from './components/layout/GameLayout';
import { HeroSelectPhase } from './components/phases/HeroSelectPhase';
import { UpgradePhase } from './components/phases/UpgradePhase';
import { DifficultyPhase } from './components/phases/DifficultyPhase';
import { BattlePhase } from './components/phases/BattlePhase';
import { SettlementPhase } from './components/phases/SettlementPhase';
import { ShopPhase } from './components/phases/ShopPhase';
import { GameOverPhase } from './components/phases/GameOverPhase';
import { VictoryPhase } from './components/phases/VictoryPhase';

function StartMenu() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">三国战纪</h1>
        <p className="text-gray-400 text-lg">自动战斗 Roguelike</p>
      </div>
      <div className="space-y-3 text-gray-500 text-sm max-w-md">
        <p>招募三国武将，组建最强阵容</p>
        <p>选择敌人难度，赚取金币购买装备</p>
        <p>挑战30回合，看你能走多远</p>
      </div>
      <button
        className="px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-white text-xl rounded-lg font-bold transition-all hover:scale-105"
        onClick={startNewGame}
      >
        开始游戏
      </button>
    </div>
  );
}

export default function App() {
  const phase = useGameStore((s) => s.phase);

  const renderPhase = () => {
    switch (phase) {
      case 'start_menu':
        return <StartMenu />;
      case 'hero_select':
        return <HeroSelectPhase />;
      case 'upgrade':
        return <UpgradePhase />;
      case 'difficulty_choice':
        return <DifficultyPhase />;
      case 'battle':
        return <BattlePhase />;
      case 'settlement':
        return <SettlementPhase />;
      case 'shop':
        return <ShopPhase />;
      case 'game_over':
        return <GameOverPhase />;
      case 'victory':
        return <VictoryPhase />;
      default:
        return <StartMenu />;
    }
  };

  return (
    <GameLayout>
      {renderPhase()}
    </GameLayout>
  );
}

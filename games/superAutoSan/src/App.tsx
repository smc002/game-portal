import { useGameStore } from './store/gameStore';
import { TitleScreen } from './pages/TitleScreen';
import { ShopScreen } from './pages/ShopScreen';
import { BattleScreen } from './pages/BattleScreen';
import { GameOverScreen } from './pages/GameOverScreen';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'battle':
      return <BattleScreen />;
    case 'gameOver':
      return <GameOverScreen />;
  }
}

import { useGameStore } from './store/gameStore';
import TitleScreen from './pages/TitleScreen';
import StarterSelect from './pages/StarterSelect';
import MapScreen from './pages/MapScreen';
import BattleScreen from './pages/BattleScreen';
import CaptureScreen from './pages/CaptureScreen';
import ShopScreen from './pages/ShopScreen';
import RestScreen from './pages/RestScreen';
import EventScreen from './pages/EventScreen';
import TeamScreen from './pages/TeamScreen';
import ResultScreen from './pages/ResultScreen';

function CurrentPage() {
  const phase = useGameStore((s) => s.phase);

  switch (phase) {
    case 'title': return <TitleScreen />;
    case 'starterSelect': return <StarterSelect />;
    case 'map': return <MapScreen />;
    case 'battle': return <BattleScreen />;
    case 'capture': return <CaptureScreen />;
    case 'shop': return <ShopScreen />;
    case 'rest': return <RestScreen />;
    case 'event': return <EventScreen />;
    case 'team': return <TeamScreen />;
    case 'result': return <ResultScreen />;
  }
}

export default function App() {
  return (
    <div className="game-container">
      <CurrentPage />
    </div>
  );
}

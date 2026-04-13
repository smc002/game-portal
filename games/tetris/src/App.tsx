import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import Board from './components/Board';
import HoldPanel from './components/HoldPanel';
import NextQueue from './components/NextQueue';
import ScorePanel from './components/ScorePanel';
import Overlay from './components/Overlay';
import Controls from './components/Controls';

export default function App() {
  useGameLoop();
  useKeyboard();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="relative">
        <div className="flex items-start gap-4">
          {/* 左栏 */}
          <div className="flex w-28 flex-col gap-3">
            <HoldPanel />
            <ScorePanel />
          </div>

          {/* 棋盘 */}
          <Board />

          {/* 右栏 */}
          <div className="flex w-24 flex-col gap-3">
            <NextQueue />
          </div>
        </div>

        <Controls />

        <Overlay />
      </div>
    </div>
  );
}

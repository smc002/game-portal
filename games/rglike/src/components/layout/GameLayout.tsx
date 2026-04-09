import { ReactNode } from 'react';
import { Header } from './Header';
import { useGameStore } from '../../store/gameStore';

interface GameLayoutProps {
  children: ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const phase = useGameStore((s) => s.phase);
  const showHeader = phase !== 'start_menu';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {showHeader && <Header />}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}

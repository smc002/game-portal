import { useRef, useEffect } from 'react';
import { BattleAction } from '../../types';

interface BattleLogProps {
  actions: BattleAction[];
}

export function BattleLog({ actions }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions.length]);

  const getActionColor = (action: BattleAction): string => {
    if (action.type === 'dot') return 'text-orange-400';
    if (action.type === 'itemEffect') return 'text-yellow-400';
    if (action.type === 'passive') return 'text-purple-400';
    if (action.type === 'phaseChange') return 'text-red-400 font-bold';
    if (action.targets.some((t) => t.healing)) return 'text-green-400';

    // Check if actor is ally or enemy based on ID prefix
    if (action.actorId.startsWith('ally_')) return 'text-blue-300';
    if (action.actorId.startsWith('enemy_')) return 'text-red-300';
    return 'text-gray-300';
  };

  return (
    <div
      ref={scrollRef}
      className="h-40 overflow-y-auto bg-gray-950 rounded-lg p-2 border border-gray-800 text-xs space-y-0.5"
    >
      {actions.slice(-50).map((action, i) => (
        <div key={i} className={getActionColor(action)}>
          {action.description}
        </div>
      ))}
      {actions.length === 0 && (
        <div className="text-gray-600 text-center mt-4">战斗即将开始...</div>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useBattleStore } from '../../store/battleStore';
import { useGameStore } from '../../store/gameStore';
import { useBattleSimulation } from '../../hooks/useBattleSimulation';
import { BattleArena } from '../battle/BattleArena';
import { BattleLog } from '../battle/BattleLog';
import { BattleControls } from '../battle/BattleControls';

export function BattlePhase() {
  const { allies, enemies, actionLog, status, speed, setSpeed } = useBattleStore();
  const completeBattle = useGameStore((s) => s.completeBattle);
  const { skipBattle } = useBattleSimulation();

  useEffect(() => {
    if (status === 'won' || status === 'lost') {
      const timer = setTimeout(() => {
        completeBattle(status === 'won');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, completeBattle]);

  const lastActorId = actionLog.length > 0 ? actionLog[actionLog.length - 1].actorId : undefined;

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          {status === 'won' ? '战斗胜利！' : status === 'lost' ? '战斗失败...' : '战斗中'}
        </h2>
        {status === 'running' && (
          <BattleControls speed={speed} onSpeedChange={setSpeed} onSkip={skipBattle} />
        )}
      </div>

      <BattleArena allies={allies} enemies={enemies} lastActorId={lastActorId} />

      <BattleLog actions={actionLog} />

      {status === 'won' && (
        <div className="text-center text-green-400 text-lg font-bold animate-pulse">
          胜利！正在结算...
        </div>
      )}
      {status === 'lost' && (
        <div className="text-center text-red-400 text-lg font-bold animate-pulse">
          全军覆没...
        </div>
      )}
    </div>
  );
}

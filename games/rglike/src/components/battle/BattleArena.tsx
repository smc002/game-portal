import { BattleUnit } from '../../types';
import { UnitCard } from './UnitCard';

interface BattleArenaProps {
  allies: BattleUnit[];
  enemies: BattleUnit[];
  lastActorId?: string;
}

export function BattleArena({ allies, enemies, lastActorId }: BattleArenaProps) {
  return (
    <div className="flex items-center justify-center gap-8 w-full">
      {/* Allies */}
      <div className="flex flex-col gap-2 items-end">
        <span className="text-blue-400 text-xs font-bold mb-1">我方</span>
        {allies.map((unit) => (
          <UnitCard key={unit.id} unit={unit} isActing={unit.id === lastActorId} />
        ))}
      </div>

      {/* VS */}
      <div className="text-gray-600 text-2xl font-bold">VS</div>

      {/* Enemies */}
      <div className="flex flex-col gap-2 items-start">
        <span className="text-red-400 text-xs font-bold mb-1">敌方</span>
        {enemies.map((unit) => (
          <UnitCard key={unit.id} unit={unit} isActing={unit.id === lastActorId} />
        ))}
      </div>
    </div>
  );
}

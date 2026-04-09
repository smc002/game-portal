import { BattleSpeed } from '../../types';

interface BattleControlsProps {
  speed: BattleSpeed;
  onSpeedChange: (speed: BattleSpeed) => void;
  onSkip: () => void;
  isPaused?: boolean;
}

export function BattleControls({ speed, onSpeedChange, onSkip }: BattleControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 4] as BattleSpeed[]).map((s) => (
        <button
          key={s}
          className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
            speed === s
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => onSpeedChange(s)}
        >
          {s}x
        </button>
      ))}
      <button
        className="px-3 py-1 rounded text-sm font-bold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
        onClick={onSkip}
      >
        跳过
      </button>
    </div>
  );
}

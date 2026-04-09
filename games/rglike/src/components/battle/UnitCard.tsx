import { BattleUnit } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { ACTION_BAR_MAX } from '../../utils/constants';

const STATUS_ICONS: Record<string, string> = {
  taunt: '挑',
  burn: '火',
  atkBuff: '攻',
  spdBuff: '速',
  spdDebuff: '缓',
  shield: '盾',
  hot: '回',
  charm: '惑',
  defDown: '破',
};

interface UnitCardProps {
  unit: BattleUnit;
  isActing?: boolean;
}

export function UnitCard({ unit, isActing }: UnitCardProps) {
  const hpPercent = unit.currentHp / unit.maxHp;
  const hpColor = hpPercent > 0.6 ? '#22c55e' : hpPercent > 0.3 ? '#f59e0b' : '#ef4444';

  return (
    <div
      className={`rounded-lg border p-2 w-28 transition-all duration-300 ${
        !unit.isAlive
          ? 'opacity-30 grayscale border-gray-700'
          : isActing
          ? 'border-yellow-400 shadow-lg shadow-yellow-400/30 scale-105'
          : unit.side === 'ally'
          ? 'border-blue-700'
          : 'border-red-700'
      } ${unit.isBoss ? 'w-36' : ''}`}
      style={{ backgroundColor: 'rgba(17, 24, 39, 0.9)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold truncate ${unit.side === 'ally' ? 'text-blue-300' : 'text-red-300'}`}>
          {unit.name}
        </span>
        {unit.level && (
          <span className="text-xs text-yellow-400">Lv.{unit.level}</span>
        )}
      </div>

      {/* HP Bar */}
      <div className="mb-1">
        <ProgressBar current={unit.currentHp} max={unit.maxHp} color={hpColor} height={6} showText />
      </div>

      {/* ATB Bar */}
      <div className="mb-1">
        <ProgressBar
          current={Math.min(unit.actionBar, ACTION_BAR_MAX)}
          max={ACTION_BAR_MAX}
          color="#eab308"
          height={3}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-0.5 text-[10px] text-gray-400 mb-1">
        <span>ATK:{unit.atk}</span>
        <span>DEF:{unit.def}</span>
      </div>

      {/* Status Effects */}
      {unit.statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {unit.statusEffects.map((effect, i) => (
            <span
              key={`${effect.type}-${i}`}
              className={`text-[10px] px-1 rounded ${
                effect.type === 'burn' || effect.type === 'spdDebuff' || effect.type === 'charm' || effect.type === 'defDown'
                  ? 'bg-red-900 text-red-300'
                  : 'bg-blue-900 text-blue-300'
              }`}
            >
              {STATUS_ICONS[effect.type] || effect.type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

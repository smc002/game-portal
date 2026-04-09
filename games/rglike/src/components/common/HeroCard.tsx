import { HeroDefinition, HeroInstance } from '../../types';
import { getHeroDefinition } from '../../data/heroes';
import { computeHeroStats } from '../../engine/heroUtils';

const ROLE_COLORS: Record<string, string> = {
  singleDPS: '#ef4444',
  aoeDPS: '#f97316',
  healer: '#22c55e',
  buffer: '#3b82f6',
  tank: '#a855f7',
  controller: '#ec4899',
};

const ROLE_NAMES: Record<string, string> = {
  singleDPS: '单体输出',
  aoeDPS: '范围输出',
  healer: '治疗',
  buffer: '增益',
  tank: '坦克',
  controller: '控制',
};

interface HeroCardProps {
  heroId: string;
  instance?: HeroInstance;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export function HeroCard({ heroId, instance, onClick, selected, compact }: HeroCardProps) {
  const def = getHeroDefinition(heroId);
  const level = instance?.level || 1;
  const stats = instance
    ? computeHeroStats(instance, [])
    : def.baseStats;

  const roleColor = ROLE_COLORS[def.role] || '#6b7280';

  return (
    <div
      className={`rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
        selected ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-gray-600 hover:border-gray-400'
      }`}
      style={{ borderLeftColor: roleColor, borderLeftWidth: 4 }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-white text-lg">{def.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: roleColor, color: 'white' }}>
          {ROLE_NAMES[def.role]}
        </span>
      </div>
      {!compact && (
        <p className="text-gray-400 text-xs mb-2">{def.title}</p>
      )}
      {instance && (
        <div className="text-yellow-400 text-sm mb-2">Lv.{level}</div>
      )}
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
        <span>HP: {stats.hp}</span>
        <span>ATK: {stats.atk}</span>
        <span>DEF: {stats.def}</span>
        <span>SPD: {stats.spd}</span>
      </div>
      {!compact && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <p className="text-xs text-yellow-300 mb-1">
            <span className="font-bold">被动 - {def.passive.name}：</span>
            {def.passive.description}
          </p>
          <p className="text-xs text-blue-300">
            <span className="font-bold">技能 - {def.skill.name}：</span>
            {def.skill.description}
          </p>
        </div>
      )}
    </div>
  );
}

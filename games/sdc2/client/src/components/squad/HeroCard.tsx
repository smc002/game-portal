import type { HeroInstance } from '../../../../shared/types/hero.js';
import { Faction, HeroClass } from '../../../../shared/types/hero.js';
import { HERO_MAP } from '../../../../shared/data/heroes.js';

const FACTION_COLORS: Record<Faction, string> = {
  [Faction.Wei]: '#5b8abf',
  [Faction.Shu]: '#4a9e5a',
  [Faction.Wu]: '#c45050',
  [Faction.Qun]: '#8e6ab8',
};

const FACTION_LABELS: Record<Faction, string> = {
  [Faction.Wei]: '魏',
  [Faction.Shu]: '蜀',
  [Faction.Wu]: '吴',
  [Faction.Qun]: '群',
};

const CLASS_LABELS: Record<HeroClass, string> = {
  [HeroClass.MengJiang]: '猛将',
  [HeroClass.MouShi]: '谋士',
  [HeroClass.HouQin]: '后勤',
};

interface Props {
  hero: HeroInstance;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function HeroCard({ hero, compact, selected, onClick, draggable, onDragStart }: Props) {
  const factionColor = FACTION_COLORS[hero.faction];
  const stars = '★'.repeat(hero.starLevel) + '☆'.repeat(5 - hero.starLevel);
  const template = HERO_MAP.get(hero.templateId);

  if (compact) {
    return (
      <div
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 8px',
          background: selected ? 'rgba(139, 105, 20, 0.15)' : 'var(--color-bg-panel)',
          border: `1px solid ${selected ? factionColor : '#3a2a1a'}`,
          cursor: onClick ? 'pointer' : draggable ? 'grab' : 'default',
          minWidth: '100px',
        }}
      >
        <span style={{
          fontSize: '10px', fontWeight: 'bold', color: factionColor,
          background: `${factionColor}15`, padding: '1px 4px',
          border: `1px solid ${factionColor}30`,
          fontFamily: 'var(--font-heading)',
        }}>
          {FACTION_LABELS[hero.faction]}
        </span>
        <span style={{
          fontSize: '13px', fontWeight: 'bold',
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-bright)',
        }}>
          {hero.name}
        </span>
        <span style={{ fontSize: '10px', color: '#d4a017' }}>{stars}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      style={{
        width: '150px',
        padding: '10px',
        background: selected
          ? 'linear-gradient(180deg, rgba(139, 105, 20, 0.15), rgba(92, 58, 33, 0.1))'
          : 'var(--color-bg-panel)',
        border: `1px solid ${selected ? factionColor : '#5c3a21'}`,
        cursor: onClick ? 'pointer' : draggable ? 'grab' : 'default',
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
      }}
    >
      {/* 内边框装饰 */}
      <div style={{
        position: 'absolute', inset: '3px',
        border: '1px solid rgba(92, 58, 33, 0.2)',
        pointerEvents: 'none',
      }} />

      {/* 头部：阵营 + 职业 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 'bold', color: factionColor,
          background: `${factionColor}15`, padding: '1px 6px',
          border: `1px solid ${factionColor}30`,
          fontFamily: 'var(--font-heading)',
        }}>
          {FACTION_LABELS[hero.faction]}
        </span>
        <span style={{
          fontSize: '11px', color: 'var(--color-text-dim)',
          fontFamily: 'var(--font-heading)',
        }}>
          {CLASS_LABELS[hero.heroClass]}
        </span>
      </div>

      {/* 名字 */}
      <div style={{
        fontSize: '17px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px',
        fontFamily: 'var(--font-heading)',
        color: 'var(--color-text-bright)',
        letterSpacing: '2px',
      }}>
        {hero.name}
      </div>

      {/* 星级 */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#d4a017', marginBottom: '8px' }}>
        {stars}
      </div>

      {/* 属性 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', marginBottom: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#c41e3a', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>{hero.attack}</div>
          <div style={{ color: 'var(--color-text-dim)', fontSize: '9px' }}>攻</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#5b8abf', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>{hero.speed}</div>
          <div style={{ color: 'var(--color-text-dim)', fontSize: '9px' }}>速</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#d4a017', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>{hero.specialPower}</div>
          <div style={{ color: 'var(--color-text-dim)', fontSize: '9px' }}>特</div>
        </div>
      </div>

      {/* 技能描述 */}
      <div style={{
        fontSize: '10px', color: 'var(--color-text-dim)',
        lineHeight: '1.4', padding: '4px 6px',
        background: 'rgba(10, 6, 4, 0.5)',
        border: '1px solid #3a2a1a',
      }}>
        {template?.skillDescription ?? hero.skillId}
      </div>
    </div>
  );
}

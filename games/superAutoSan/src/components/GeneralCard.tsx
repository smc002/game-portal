import type { GeneralDef } from '../data/types';
import { TIER_COLORS } from '../data/types';
import { Tooltip } from './Tooltip';

interface Props {
  def: GeneralDef;
  frozen?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onFreeze?: () => void;
}

export function GeneralCard({ def, frozen, onClick, onFreeze }: Props) {
  const tierColor = TIER_COLORS[def.tier] ?? '#888';

  const tooltipContent = (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{def.name}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginBottom: 4 }}>Tier {def.tier} | {def.baseAtk}/{def.baseHp}</div>
      <div style={{ color: '#ccc' }}>{def.abilityDesc}</div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        onClick={onClick}
        style={{
          width: 'var(--card-width)',
          height: 'var(--card-height)',
          background: 'var(--bg-card)',
          border: `2px solid ${frozen ? '#00bfff' : tierColor}`,
          borderRadius: 'var(--border-radius)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 4,
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Tier badge */}
        <div style={{
          position: 'absolute',
          top: 2,
          left: 2,
          fontSize: 9,
          color: tierColor,
          fontWeight: 'bold',
        }}>
          T{def.tier}
        </div>

        {/* Freeze button */}
        {onFreeze && (
          <div
            onClick={(e) => { e.stopPropagation(); onFreeze(); }}
            style={{
              position: 'absolute',
              top: 1,
              right: 2,
              fontSize: 10,
              cursor: 'pointer',
              color: frozen ? '#00bfff' : 'var(--text-secondary)',
            }}
          >
            {frozen ? '❄' : '○'}
          </div>
        )}

        {/* Color block */}
        <div style={{
          width: 36,
          height: 36,
          background: tierColor,
          borderRadius: 2,
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#fff',
          fontWeight: 'bold',
        }}>
          {def.name[0]}
        </div>

        {/* Name */}
        <div style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden' }}>
          {def.name}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
          <span className="atk">{def.baseAtk}</span>
          <span className="hp">{def.baseHp}</span>
        </div>
      </div>
    </Tooltip>
  );
}

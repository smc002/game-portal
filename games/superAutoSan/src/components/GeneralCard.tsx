import type { GeneralDef } from '../data/types';
import { TIER_COLORS } from '../data/types';
import { useShopStore } from '../store/shopStore';
import { Tooltip } from './Tooltip';

interface Props {
  def: GeneralDef;
  frozen?: boolean;
  mergeMode?: 'levelup' | 'merge' | null;
  onClick?: (e?: React.MouseEvent) => void;
  onFreeze?: () => void;
}

export function GeneralCard({ def, frozen, mergeMode, onClick, onFreeze }: Props) {
  const canMerge = mergeMode != null;
  const willLevelUp = mergeMode === 'levelup';
  const tierColor = TIER_COLORS[def.tier] ?? '#888';
  const bonus = useShopStore((s) => s.cannedFoodBonus);
  const displayAtk = def.baseAtk + bonus.atk;
  const displayHp = def.baseHp + bonus.hp;
  const hasBonus = bonus.atk > 0 || bonus.hp > 0;

  const tooltipContent = (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{def.name}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginBottom: 4 }}>Tier {def.tier} | {displayAtk}/{displayHp}{hasBonus ? ` (基础 ${def.baseAtk}/${def.baseHp})` : ''}</div>
      <div style={{ color: '#ccc' }}>{def.abilityDesc}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 9, marginTop: 4 }}>
        Lv.2/Lv.3 时数值按等级倍增
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        onClick={onClick}
        className={canMerge ? 'shop-can-merge' : undefined}
        style={{
          width: 'var(--card-width)',
          height: 'var(--card-height)',
          background: 'var(--bg-card)',
          border: `2px solid ${frozen ? '#00bfff' : canMerge ? '#44ff44' : tierColor}`,
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
        {/* Merge indicator badge */}
        {canMerge && (
          <div style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: willLevelUp ? 9 : 11,
            color: willLevelUp ? '#0a3' : '#0a3',
            background: '#44ff44',
            padding: willLevelUp ? '1px 6px' : '0px 5px',
            borderRadius: 8,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 6px rgba(68,255,68,0.6)',
            lineHeight: 1.2,
          }}>
            {willLevelUp ? '↑升级' : '↑'}
          </div>
        )}
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
              top: -2,
              right: -2,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              cursor: 'pointer',
              color: frozen ? '#00bfff' : '#888',
              background: frozen ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
              border: `1px solid ${frozen ? '#00bfff' : '#555'}`,
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
          <span className="atk">{displayAtk}</span>
          <span className="hp">{displayHp}</span>
        </div>
      </div>
    </Tooltip>
  );
}
